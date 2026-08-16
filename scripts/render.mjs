/**
 * Render CLI sekali jalan.
 *   npm run render
 *   COMP=DemoLombok OUT=out/demo.mp4 npm run render
 */
import { renderVideo } from './lib/render-core.mjs';
import path from 'node:path';

/**
 * Lapor progress ke Worker (dipakai saat jalan di CI).
 * Dibatasi agar tidak membanjiri: minimal 12 detik antar laporan.
 */
const CB = process.env.CALLBACK_URL;
const CB_SECRET = process.env.CALLBACK_SECRET;
let lastPing = 0;
async function report(body) {
  if (!CB || !CB_SECRET) return;
  const now = Date.now();
  if (body.progress !== 1 && now - lastPing < 12000) return;
  lastPing = now;
  try {
    await fetch(CB, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${CB_SECRET}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* callback gagal tidak boleh menggagalkan render */
  }
}

const compositionId = process.env.COMP ?? 'VerticalPromo';

/** Props dari CI (JSON string). Aman kalau kosong / bukan objek. */
let inputProps = {};
try {
  const parsed = JSON.parse(process.env.INPUT_PROPS ?? '{}');
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) inputProps = parsed;
} catch {
  console.warn('INPUT_PROPS bukan JSON valid, diabaikan');
}
const outputPath = path.resolve(process.env.OUT ?? 'out/promo.mp4');
const entry = process.env.ENTRY ?? 'src/index.tsx';
const audioPath = path.resolve('public/narration.mp3');

const t0 = Date.now();
let lastStage = '';

const result = await renderVideo({
  entry,
  compositionId,
  outputPath,
  audioPath,
  inputProps,
  onProgress: ({ stage, progress, message }) => {
    if (stage !== lastStage) {
      lastStage = stage;
      console.log(`▸ ${stage}`);
    }
    if (stage === 'rendering') process.stdout.write(`\r  ${message}   `);
    // 0.2–0.95 dipetakan ke rentang progress keseluruhan job
    report({ status: 'running', stage, progress: 0.2 + progress * 0.75, message });
  },
});

const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(
  `\n✔ ${result.outputPath}\n  ${result.width}×${result.height} · ${result.frames} frame · ` +
    `${(result.bytes / 1024 / 1024).toFixed(1)} MB · ${secs}s`
);
process.exit(0);
