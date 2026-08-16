/**
 * Menggabungkan potongan narasi (public/audio/segN.mp3) menjadi
 * public/narration.mp3, dengan lead-in & jeda sesuai timeline.json.
 *
 * Dipisah dari build-timeline agar keduanya bisa dijalankan mandiri:
 *   npm run timeline && npm run audio
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const AUDIO_DIR = path.resolve('public/audio');
const OUT = path.resolve('public/narration.mp3');
const TMP = path.resolve('public/audio/.tmp');

const timeline = JSON.parse(fs.readFileSync('src/generated/timeline.json', 'utf8'));
const { leadInSec, gapSec } = timeline.audio;

fs.mkdirSync(TMP, { recursive: true });

async function silence(sec, out) {
  await run(ffmpegPath, [
    '-y', '-f', 'lavfi', '-t', String(sec),
    '-i', 'anullsrc=r=44100:cl=mono',
    '-c:a', 'libmp3lame', out,
  ]);
}

const lead = path.join(TMP, 'lead.mp3');
const gap = path.join(TMP, 'gap.mp3');
await silence(leadInSec, lead);
await silence(gapSec, gap);

const parts = [lead];
timeline.scenes.forEach((s, i) => {
  parts.push(path.join(AUDIO_DIR, `${s.id}.mp3`));
  if (i < timeline.scenes.length - 1) parts.push(gap);
});

const listFile = path.join(TMP, 'list.txt');
fs.writeFileSync(listFile, parts.map((p) => `file '${p}'`).join('\n'));

await run(ffmpegPath, [
  '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100',
  OUT,
]);

fs.rmSync(TMP, { recursive: true, force: true });

const stat = fs.statSync(OUT);
console.log(`✔ narration.mp3 — ${(stat.size / 1024).toFixed(0)} KB dari ${timeline.scenes.length} segmen`);
