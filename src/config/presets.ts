/**
 * Preset gaya visual, animasi caption, dan suara narator.
 *
 * Semuanya murni data supaya bisa dipilih dari web (dikirim lewat inputProps)
 * DAN dipakai saat render tanpa menyentuh kode.
 */

/* ------------------------------------------------------------------ */
/* Tema warna                                                          */
/* ------------------------------------------------------------------ */

export interface ThemePreset {
  id: string;
  label: string;
  bg: string;
  accent: string;
  accentWarm: string;
  /** rentang hue latar bergerak */
  hueFrom: number;
  hueTo: number;
}

export const themePresets: ThemePreset[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    bg: '#05070c',
    accent: '#58a6ff',
    accentWarm: '#ffd166',
    hueFrom: 205,
    hueTo: 285,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    bg: '#0d0507',
    accent: '#ff7b6b',
    accentWarm: '#ffc266',
    hueFrom: 340,
    hueTo: 30,
  },
  {
    id: 'forest',
    label: 'Forest',
    bg: '#04090a',
    accent: '#3fd6a0',
    accentWarm: '#d9f27e',
    hueFrom: 150,
    hueTo: 190,
  },
  {
    id: 'grape',
    label: 'Grape',
    bg: '#07060e',
    accent: '#a78bfa',
    accentWarm: '#f0abfc',
    hueFrom: 255,
    hueTo: 310,
  },
  {
    id: 'mono',
    label: 'Mono',
    bg: '#08080a',
    accent: '#e6edf3',
    accentWarm: '#9aa4b2',
    hueFrom: 220,
    hueTo: 230,
  },
];

/* ------------------------------------------------------------------ */
/* Gaya caption / subtitle                                             */
/* ------------------------------------------------------------------ */

export type CaptionAnim =
  | 'highlight' // kata aktif berubah warna (default)
  | 'pop' // kata aktif membesar
  | 'karaoke' // kata terlewat meredup
  | 'bounce' // kata aktif memantul
  | 'typewriter' // muncul huruf demi huruf
  | 'boxed' // kata aktif diberi kotak warna
  | 'wave'; // kata aktif naik-turun halus

export interface CaptionPreset {
  id: CaptionAnim;
  label: string;
  hint: string;
}

export const captionPresets: CaptionPreset[] = [
  { id: 'highlight', label: 'Highlight', hint: 'Kata aktif berwarna aksen' },
  { id: 'pop', label: 'Pop', hint: 'Kata aktif membesar' },
  { id: 'karaoke', label: 'Karaoke', hint: 'Kata terlewat meredup' },
  { id: 'bounce', label: 'Bounce', hint: 'Kata aktif memantul' },
  { id: 'typewriter', label: 'Typewriter', hint: 'Muncul huruf demi huruf' },
  { id: 'boxed', label: 'Boxed', hint: 'Kata aktif berlatar warna' },
  { id: 'wave', label: 'Wave', hint: 'Kata aktif melayang naik' },
];

export type CaptionPos = 'bottom' | 'center' | 'top';

/* ------------------------------------------------------------------ */
/* Suara narator (edge-tts, gratis tanpa API key)                      */
/* ------------------------------------------------------------------ */

export interface VoicePreset {
  id: string;
  label: string;
  voice: string;
  gender: 'perempuan' | 'laki-laki';
}

export const voicePresets: VoicePreset[] = [
  { id: 'gadis', label: 'Gadis — perempuan, hangat', voice: 'id-ID-GadisNeural', gender: 'perempuan' },
  { id: 'ardi', label: 'Ardi — laki-laki, tegas', voice: 'id-ID-ArdiNeural', gender: 'laki-laki' },
];

/** Kecepatan bicara — dipetakan ke opsi `rate` edge-tts. */
export const ratePresets = [
  { id: 'slow', label: 'Pelan', rate: '-15%' },
  { id: 'normal', label: 'Normal', rate: '+0%' },
  { id: 'fast', label: 'Cepat', rate: '+15%' },
] as const;

export type RateId = (typeof ratePresets)[number]['id'];

/* ------------------------------------------------------------------ */
/* Gabungan: opsi gaya yang dikirim dari web                           */
/* ------------------------------------------------------------------ */

export interface StyleOptions {
  theme?: string;
  captionAnim?: CaptionAnim;
  captionPos?: CaptionPos;
  captionSize?: number;
  /** dipakai saat render untuk memilih suara TTS */
  voice?: string;
  rate?: RateId;
}

export function themeById(id?: string): ThemePreset {
  return themePresets.find((t) => t.id === id) ?? themePresets[0];
}
