/**
 * Membaca durasi asli tiap file audio narasi, lalu menghasilkan
 * src/generated/timeline.json berisi:
 *   - frame mulai & durasi tiap scene
 *   - total durasi komposisi
 *   - caption dengan timing per kata
 *
 * Jalankan ulang setiap kali narasi/audio berubah:
 *   npm run timeline
 *
 * Dengan begini tidak ada satupun nomor frame yang ditulis tangan.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';

const execFileP = promisify(execFile);

const FPS = 30;
const LEAD_IN = 0.8; // jeda hening di awal video (detik)
const GAP = 0.4; // jeda antar segmen narasi (detik)
const TAIL = 1.2; // ruang napas di akhir (detik)
const AUDIO_DIR = path.resolve('public/audio');
const OUT_DIR = path.resolve('src/generated');

/** Ambil durasi file audio (detik) via ffmpeg */
async function durationOf(file) {
  try {
    const { stderr } = await execFileP(ffmpegPath, ['-i', file]);
    return parse(stderr);
  } catch (e) {
    // ffmpeg keluar dengan kode != 0 saat tanpa output file — itu normal
    return parse(e.stderr ?? '');
  }
}

function parse(stderr) {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error('Tidak bisa membaca durasi audio');
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

/**
 * Bagi durasi segmen ke tiap kata, dibobot panjang karakter.
 * Pendekatan heuristik — untuk timing sempurna gunakan Whisper
 * (lihat parseWhisperTranscript di @rendiv/captions).
 */
function wordTimings(text, startSec, durSec) {
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = startSec;
  return words.map((w, i) => {
    const d = (durSec * weights[i]) / total;
    const item = { text: w, startMs: Math.round(t * 1000), endMs: Math.round((t + d) * 1000) };
    t += d;
    return item;
  });
}

async function main() {
  // import konten (TS) lewat transpile ringan: baca via tsx tidak tersedia,
  // jadi konten dibaca dari JSON hasil ekspor build-content.
  const { content } = await import('../src/config/content.mjs');

  // Narasi bisa ditimpa dari CI (harus SAMA dengan yang dipakai tts.py),
  // kalau tidak caption akan menampilkan teks lama sementara audionya baru.
  let narrationOverride = {};
  const narFile = process.env.NARRATION_FILE;
  if (narFile && fs.existsSync(narFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(narFile, 'utf8'));
      if (parsed && typeof parsed === 'object') narrationOverride = parsed;
    } catch {
      console.warn('! NARRATION_FILE bukan JSON valid, diabaikan');
    }
  }

  const scenes = [];
  const captions = [];
  let cursor = LEAD_IN;

  for (const scene of content.scenes) {
    const file = path.join(AUDIO_DIR, `${scene.id}.mp3`);
    if (!fs.existsSync(file)) {
      throw new Error(`Audio hilang: ${file}\nJalankan generate TTS dulu untuk scene "${scene.id}".`);
    }
    const dur = await durationOf(file);
    const narration = narrationOverride[scene.id]?.trim() || scene.narration;

    scenes.push({
      id: scene.id,
      kind: scene.kind,
      from: Math.round(cursor * FPS),
      durationInFrames: Math.round((dur + GAP) * FPS),
      audioStartSec: +cursor.toFixed(3),
      audioDurSec: +dur.toFixed(3),
    });

    captions.push({
      text: narration,
      startMs: Math.round(cursor * 1000),
      endMs: Math.round((cursor + dur) * 1000),
      words: wordTimings(narration, cursor, dur),
    });

    cursor += dur + GAP;
  }

  const totalSec = cursor - GAP + TAIL;
  const timeline = {
    fps: FPS,
    width: 1080,
    height: 1920,
    durationInFrames: Math.round(totalSec * FPS),
    narrationEndFrame: Math.round((cursor - GAP) * FPS),
    scenes,
    captions,
    // metadata untuk audio gabungan
    audio: { leadInSec: LEAD_IN, gapSec: GAP },
  };

  // scene terakhir dipanjangkan sampai ujung video
  const last = timeline.scenes[timeline.scenes.length - 1];
  last.durationInFrames = timeline.durationInFrames - last.from;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'timeline.json'), JSON.stringify(timeline, null, 2));

  console.log(`✔ timeline.json — ${timeline.durationInFrames} frame (${totalSec.toFixed(1)}s)`);
  for (const s of timeline.scenes) {
    console.log(`   ${s.id.padEnd(6)} ${String(s.from).padStart(5)} → ${s.from + s.durationInFrames}  (${s.audioDurSec}s)`);
  }
}

main().catch((e) => {
  console.error('✘', e.message);
  process.exit(1);
});
