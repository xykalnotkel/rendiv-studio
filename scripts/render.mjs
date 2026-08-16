/**
 * Render CLI sekali jalan.
 *   npm run render
 *   COMP=DemoLombok OUT=out/demo.mp4 npm run render
 */
import { renderVideo } from './lib/render-core.mjs';
import path from 'node:path';

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
  onProgress: ({ stage, message }) => {
    if (stage !== lastStage) {
      lastStage = stage;
      console.log(`▸ ${stage}`);
    }
    if (stage === 'rendering') process.stdout.write(`\r  ${message}   `);
  },
});

const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(
  `\n✔ ${result.outputPath}\n  ${result.width}×${result.height} · ${result.frames} frame · ` +
    `${(result.bytes / 1024 / 1024).toFixed(1)} MB · ${secs}s`
);
process.exit(0);
