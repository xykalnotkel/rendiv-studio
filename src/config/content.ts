/**
 * SATU-SATUNYA sumber kebenaran untuk isi video.
 *
 * Tidak ada nomor frame di sini — durasi tiap scene ditentukan oleh
 * panjang audio narasinya, dihitung otomatis oleh scripts/build-timeline.mjs.
 * Ubah teks di file ini, jalankan `npm run timeline`, dan seluruh video
 * menyesuaikan diri sendiri.
 */

export type SceneKind = 'hook' | 'code' | 'param' | 'steps' | 'outro';

export interface SceneContent {
  /** id unik, dipakai juga sebagai nama file audio: public/audio/<id>.mp3 */
  id: string;
  kind: SceneKind;
  /** Teks narasi. Ini yang di-TTS dan jadi caption. */
  narration: string;
  /** Data khusus per jenis scene */
  data?: Record<string, unknown>;
}

export interface VideoContent {
  title: string;
  scenes: SceneContent[];
}

// Data aslinya ada di content.mjs (plain JS) agar bisa dibaca
// oleh script Node (scripts/*.mjs) DAN oleh bundler Vite tanpa duplikasi.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- deklarasi tipe ada di content.d.mts
import { content as raw } from './content.mjs';

export const content: VideoContent = raw as VideoContent;
