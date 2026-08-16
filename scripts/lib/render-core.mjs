/**
 * Inti pipeline render, dipakai oleh:
 *   - scripts/render.mjs        (CLI sekali jalan)
 *   - scripts/render-server.mjs (worker HTTP dengan antrian job)
 *
 * Alur: bundle → render frame ke disk → encode video → mux audio.
 * Encode & mux sengaja dipisah karena FFmpeg pernah OOM saat
 * menangani 1100 frame + filter audio sekaligus di RAM 1 GB.
 */
import { bundle } from '@rendiv/bundler';
import { selectComposition, renderFrames } from '@rendiv/renderer';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** Jalankan ffmpeg, buang stdout, simpan stderr untuk pesan error. */
export function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg keluar ${code}: ${err.slice(-1500)}`))
    );
    p.on('error', reject);
  });
}

let bundleCache = null;

/** Bundle sekali lalu pakai ulang — hemat ~3 detik per job. */
export async function getBundle(entry) {
  if (bundleCache) return bundleCache;
  bundleCache = await bundle({
    entryPoint: path.resolve(entry),
    publicDir: path.resolve('public'),
  });
  return bundleCache;
}

/**
 * @param {object} opts
 * @param {string} opts.entry          entry file komposisi
 * @param {string} opts.compositionId  id komposisi
 * @param {string} opts.outputPath     tujuan file .mp4
 * @param {object} [opts.inputProps]   props untuk komposisi
 * @param {string} [opts.audioPath]    file audio yang di-mux (opsional)
 * @param {number} [opts.concurrency]  jumlah tab paralel
 * @param {[number,number]} [opts.frameRange] batasi frame (untuk tes cepat)
 * @param {(p:{stage:string,progress:number,message:string})=>void} [opts.onProgress]
 */
export async function renderVideo({
  entry = 'src/index.tsx',
  compositionId,
  outputPath,
  inputProps = {},
  audioPath,
  concurrency = Math.max(1, Math.min(4, os.cpus().length)),
  frameRange,
  onProgress = () => {},
}) {
  onProgress({ stage: 'bundling', progress: 0, message: 'Menyiapkan bundle…' });
  const bundleDir = await getBundle(entry);

  const composition = await selectComposition(bundleDir, compositionId, inputProps);

  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rendiv-frames-'));
  const total = frameRange ? frameRange[1] - frameRange[0] + 1 : composition.durationInFrames;

  try {
    let done = 0;
    onProgress({ stage: 'rendering', progress: 0, message: `0/${total} frame` });

    await renderFrames({
      serveUrl: bundleDir,
      composition,
      outputDir: framesDir,
      inputProps,
      concurrency,
      imageFormat: 'jpeg',
      jpegQuality: 94,
      ...(frameRange ? { frameRange } : {}),
      onFrameRendered: () => {
        done++;
        // lapor tiap 2% agar log tidak banjir
        if (done % Math.max(1, Math.floor(total / 50)) === 0 || done === total) {
          onProgress({
            stage: 'rendering',
            progress: (done / total) * 0.85,
            message: `${done}/${total} frame`,
          });
        }
      },
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Nama file frame selalu mulai dari 000000 walau frameRange tidak nol —
    // ini perilaku Rendiv v0.2.6, jadi -start_number tidak diperlukan.
    const silent = `${outputPath}.silent.mp4`;
    onProgress({ stage: 'encoding', progress: 0.86, message: 'Encoding video…' });
    await ffmpeg([
      '-y',
      '-framerate', String(composition.fps),
      '-i', path.join(framesDir, 'frame-%06d.jpeg'),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      silent,
    ]);

    if (audioPath && fs.existsSync(audioPath)) {
      onProgress({ stage: 'muxing', progress: 0.95, message: 'Menggabungkan audio…' });
      await ffmpeg([
        '-y',
        '-i', silent,
        '-i', audioPath,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        outputPath,
      ]);
      fs.rmSync(silent, { force: true });
    } else {
      fs.renameSync(silent, outputPath);
    }

    const { size } = fs.statSync(outputPath);
    onProgress({ stage: 'done', progress: 1, message: 'Selesai' });

    return {
      outputPath,
      bytes: size,
      frames: total,
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
    };
  } finally {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}
