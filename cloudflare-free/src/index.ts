/**
 * Worker publik — situs + API antrian render.
 *
 * Semuanya muat di Workers Free (tanpa kartu kredit):
 *   - Static Assets  : gratis, tak terbatas
 *   - KV             : 100 rb baca + 1 rb tulis/hari (gratis)
 *   - Tidak ada Container / Durable Object
 *
 * Rendernya sendiri dikerjakan GitHub Actions (gratis, tanpa kartu),
 * lalu hasilnya diunggah ke GitHub Release supaya bisa diunduh publik.
 *
 * Alur:
 *   1. Browser  POST /api/jobs            → Worker simpan job di KV
 *   2. Worker   repository_dispatch       → GitHub Actions mulai render
 *   3. Actions  PATCH /api/jobs/:id       → lapor progress (pakai secret)
 *   4. Actions  unggah MP4 ke Release     → kirim URL final
 *   5. Browser  GET /api/jobs/:id         → dapat link unduhan
 */

interface Env {
  ASSETS: Fetcher;
  JOBS: KVNamespace;
  /** Personal Access Token GitHub, scope: repo. Disimpan via `wrangler secret put` */
  GITHUB_TOKEN?: string;
  /** "owner/repo" tujuan dispatch */
  GITHUB_REPO?: string;
  /** Secret bersama agar hanya Actions yang boleh update job */
  CALLBACK_SECRET?: string;
}

type JobStatus = 'queued' | 'running' | 'done' | 'error';

interface Job {
  id: string;
  status: JobStatus;
  stage: string;
  progress: number;
  message: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  videoUrl?: string;
  bytes?: number;
  error?: string;
  runUrl?: string;
}

const TTL = 60 * 60 * 24 * 3; // job disimpan 3 hari

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });

async function readJob(env: Env, id: string): Promise<Job | null> {
  return await env.JOBS.get<Job>(`job:${id}`, 'json');
}

async function writeJob(env: Env, job: Job) {
  job.updatedAt = Date.now();
  await env.JOBS.put(`job:${job.id}`, JSON.stringify(job), { expirationTtl: TTL });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
          'access-control-allow-headers': 'content-type,authorization',
        },
      });
    }

    // ---------- status konfigurasi ----------
    if (pathname === '/api/health') {
      return json({
        ok: true,
        mode: 'github-actions',
        configured: Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO),
        repo: env.GITHUB_REPO ?? null,
      });
    }

    // ---------- buat job ----------
    if (pathname === '/api/jobs' && request.method === 'POST') {
      if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
        return json(
          {
            error: 'Render belum dikonfigurasi',
            hint: 'Set secret GITHUB_TOKEN dan var GITHUB_REPO di Worker.',
          },
          501
        );
      }

      const body = (await request.json().catch(() => ({}))) as Partial<Job>;
      const id = crypto.randomUUID().slice(0, 8);

      const job: Job = {
        id,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        message: 'Menunggu GitHub Actions…',
        compositionId: body.compositionId ?? 'VerticalPromo',
        inputProps: (body.inputProps as Record<string, unknown>) ?? {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await writeJob(env, job);

      // picu workflow lewat repository_dispatch
      const gh = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.GITHUB_TOKEN}`,
          accept: 'application/vnd.github+json',
          'content-type': 'application/json',
          'user-agent': 'rendiv-studio-worker',
        },
        body: JSON.stringify({
          event_type: 'render-video',
          client_payload: {
            jobId: id,
            compositionId: job.compositionId,
            inputProps: job.inputProps,
            callbackUrl: `${url.origin}/api/jobs/${id}`,
          },
        }),
      });

      if (!gh.ok) {
        job.status = 'error';
        job.error = `GitHub menolak: ${gh.status} ${(await gh.text()).slice(0, 200)}`;
        await writeJob(env, job);
        return json(job, 502);
      }

      return json(job, 202);
    }

    // ---------- baca / update job ----------
    const m = pathname.match(/^\/api\/jobs\/([\w-]+)$/);
    if (m) {
      const id = m[1];

      if (request.method === 'GET') {
        const job = await readJob(env, id);
        return job ? json(job) : json({ error: 'job tidak ditemukan' }, 404);
      }

      // dipanggil GitHub Actions untuk lapor progress / hasil
      if (request.method === 'PATCH') {
        const auth = request.headers.get('authorization') ?? '';
        if (!env.CALLBACK_SECRET || auth !== `Bearer ${env.CALLBACK_SECRET}`) {
          return json({ error: 'unauthorized' }, 401);
        }
        const job = await readJob(env, id);
        if (!job) return json({ error: 'job tidak ditemukan' }, 404);

        const patch = (await request.json().catch(() => ({}))) as Partial<Job>;
        for (const k of [
          'status',
          'stage',
          'progress',
          'message',
          'videoUrl',
          'bytes',
          'error',
          'runUrl',
        ] as const) {
          if (patch[k] !== undefined) (job as unknown as Record<string, unknown>)[k] = patch[k];
        }
        await writeJob(env, job);
        return json(job);
      }
    }

    if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);

    // ---------- situs statis ----------
    return env.ASSETS.fetch(request);
  },
};
