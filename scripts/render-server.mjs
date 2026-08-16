/**
 * Worker render: HTTP server + antrian job.
 * Dirancang untuk jalan di dalam container (Cloudflare Containers,
 * Fly.io, Railway, Cloud Run, VPS) — BUKAN di serverless function.
 *
 * Endpoint:
 *   GET  /health          → cek kesiapan (dipakai container platform)
 *   POST /jobs            → { compositionId, inputProps } → { id, status }
 *   GET  /jobs/:id        → status & progress
 *   GET  /jobs/:id/video  → unduh MP4 kalau sudah selesai
 *
 * Sengaja tanpa dependensi framework (pakai node:http) agar image
 * tetap ramping dan dingin-start cepat.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { renderVideo, getBundle } from './lib/render-core.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';
const TOKEN = process.env.RENDER_WORKER_TOKEN ?? '';
const OUT_DIR = process.env.OUT_DIR ?? path.join(os.tmpdir(), 'rendiv-out');
const MAX_JOBS = Number(process.env.MAX_JOBS ?? 20);

fs.mkdirSync(OUT_DIR, { recursive: true });

/** @type {Map<string, any>} */
const jobs = new Map();
const queue = [];
let running = false;

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
  });
  res.end(data);
}

function prune() {
  // buang job terlama beserta filenya kalau melebihi batas
  while (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!oldest) break;
    if (oldest.outputPath) fs.rmSync(oldest.outputPath, { force: true });
    jobs.delete(oldest.id);
  }
}

async function drain() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    job.status = 'running';
    job.startedAt = Date.now();
    try {
      const result = await renderVideo({
        compositionId: job.compositionId,
        inputProps: job.inputProps,
        outputPath: path.join(OUT_DIR, `${job.id}.mp4`),
        audioPath: path.resolve('public/narration.mp3'),
        onProgress: ({ stage, progress, message }) => {
          job.stage = stage;
          job.progress = Number(progress.toFixed(3));
          job.message = message;
        },
      });
      Object.assign(job, {
        status: 'done',
        progress: 1,
        stage: 'done',
        outputPath: result.outputPath,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        frames: result.frames,
        finishedAt: Date.now(),
      });
    } catch (err) {
      Object.assign(job, {
        status: 'error',
        error: String(err.message ?? err).slice(0, 800),
        finishedAt: Date.now(),
      });
      console.error(`[job ${job.id}] gagal:`, err.message);
    }
    prune();
  }
  running = false;
}

function publicView(job) {
  const { outputPath, ...rest } = job;
  return {
    ...rest,
    durationMs: job.finishedAt ? job.finishedAt - job.startedAt : undefined,
    videoUrl: job.status === 'done' ? `/jobs/${job.id}/video` : undefined,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    });
    return res.end();
  }

  if (url.pathname === '/health') {
    return json(res, 200, {
      ok: true,
      queued: queue.length,
      running,
      jobs: jobs.size,
      cpus: os.cpus().length,
      memMB: Math.round(os.totalmem() / 1024 / 1024),
    });
  }

  // endpoint di bawah ini butuh token kalau RENDER_WORKER_TOKEN diset
  if (TOKEN) {
    const auth = req.headers.authorization ?? '';
    if (auth !== `Bearer ${TOKEN}`) return json(res, 401, { error: 'unauthorized' });
  }

  if (req.method === 'POST' && url.pathname === '/jobs') {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1_000_000) return json(res, 413, { error: 'payload terlalu besar' });
    }
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { error: 'JSON tidak valid' });
    }

    const job = {
      id: randomUUID().slice(0, 8),
      compositionId: body.compositionId ?? 'VerticalPromo',
      inputProps: body.inputProps ?? {},
      status: 'queued',
      stage: 'queued',
      progress: 0,
      message: 'Menunggu antrian',
      createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    queue.push(job);
    drain();

    return json(res, 202, publicView(job));
  }

  const m = url.pathname.match(/^\/jobs\/([\w-]+)(\/video)?$/);
  if (req.method === 'GET' && m) {
    const job = jobs.get(m[1]);
    if (!job) return json(res, 404, { error: 'job tidak ditemukan' });

    if (m[2]) {
      if (job.status !== 'done') return json(res, 409, { error: 'belum selesai', status: job.status });
      res.writeHead(200, {
        'content-type': 'video/mp4',
        'content-length': job.bytes,
        'content-disposition': `attachment; filename="${job.id}.mp4"`,
        'access-control-allow-origin': '*',
      });
      return fs.createReadStream(job.outputPath).pipe(res);
    }
    return json(res, 200, publicView(job));
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, async () => {
  console.log(`▸ worker render siap di http://${HOST}:${PORT}`);
  console.log(`  ${os.cpus().length} vCPU · ${Math.round(os.totalmem() / 1024 / 1024)} MB RAM`);
  // panaskan bundle supaya job pertama tidak kena penalti
  try {
    await getBundle(process.env.ENTRY ?? 'src/index.tsx');
    console.log('  bundle siap');
  } catch (e) {
    console.warn('  gagal memanaskan bundle:', e.message);
  }
});
