/**
 * Design tokens terpusat.
 * Semua warna/tipografi/spasi diambil dari sini supaya konsisten
 * dan gampang di-rebrand tanpa menyentuh komponen scene.
 */

export const theme = {
  font: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  color: {
    bg: '#05070c',
    surface: 'rgba(255,255,255,0.055)',
    border: 'rgba(255,255,255,0.11)',
    text: '#ffffff',
    muted: '#8b949e',
    subtle: '#c9d1d9',
    accent: '#58a6ff',
    accentWarm: '#ffd166',
    success: '#3fb950',
    danger: '#f78166',
    keyword: '#ff7b72',
  },
  radius: { sm: 16, md: 28, lg: 32, pill: 999 },
  space: (n: number) => n * 8,
  /** Ukuran font relatif terhadap lebar komposisi (dalam px @1080 lebar) */
  fontSize: {
    hero: 104,
    title: 72,
    body: 50,
    caption: 64,
    code: 34,
    small: 40,
  },
  spring: {
    soft: { damping: 16, stiffness: 100, mass: 0.9 },
    pop: { damping: 12, stiffness: 120, mass: 0.8 },
    snappy: { damping: 14, stiffness: 140, mass: 0.7 },
  },
} as const;

export type Theme = typeof theme;
