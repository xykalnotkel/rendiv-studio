import { theme } from '@video/config/theme';

const c = theme.color;

/**
 * Stylesheet global — disuntik sekali di main.tsx.
 *
 * Inline style tidak bisa media query, :hover, atau :focus-visible, padahal
 * itu yang dibutuhkan supaya layout enak di semua ukuran layar. Jadi semua
 * yang responsif ditaruh di sini sebagai CSS asli, dan komponen cukup pakai
 * className.
 *
 * Strategi breakpoint (mobile-first):
 *   < 720px  → satu kolom, player di ATAS, kontrol di bawah
 *   ≥ 720px  → dua kolom (kontrol kiri, player kanan)
 *   ≥ 1100px → kolom kontrol melebar, spasi lebih lega
 *
 * Ukuran font & padding pakai clamp() supaya menskala mulus tanpa
 * loncatan antar breakpoint.
 */
export const globalCss = `
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }
/* jaring pengaman: tidak ada yang boleh menggeser halaman ke samping */
html, body { overflow-x: hidden; max-width: 100%; }

body {
  margin: 0;
  background: ${c.bg};
  color: #e6edf3;
  font-family: ${theme.font.sans};
  line-height: 1.5;
  /* aman dari notch/rounded corner di ponsel */
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* ---------- kerangka halaman ---------- */
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(16px, 4vw, 32px) clamp(14px, 4vw, 24px) clamp(40px, 8vw, 80px);
}

.head-title {
  margin: 0;
  font-size: clamp(21px, 5.2vw, 30px);
  letter-spacing: -0.5px;
  line-height: 1.25;
}
.head-title .dim { color: ${c.muted}; font-weight: 400; }

.head-sub {
  color: ${c.muted};
  margin: 8px 0 0;
  max-width: 68ch;
  font-size: clamp(13px, 3.4vw, 15px);
  line-height: 1.6;
}

/* di layar sempit, anak kalimat kedua disembunyikan agar tidak makan tempat */
@media (max-width: 520px) {
  .head-sub .long { display: none; }
}

/* ---------- grid utama ---------- */
.layout {
  display: grid;
  gap: clamp(14px, 3vw, 24px);
  align-items: start;
  margin-top: clamp(18px, 4vw, 28px);
  grid-template-columns: 1fr;
}

/* mobile: player dulu, baru kontrol */
.col-player   { order: 1; min-width: 0; }
.col-controls { order: 2; min-width: 0; display: grid; gap: clamp(12px, 2.5vw, 16px); }
/* anak grid juga, kalau tidak konten lebar memaksa kolom melar */
.layout > * > * { min-width: 0; }

@media (min-width: 720px) {
  .layout { grid-template-columns: minmax(0, 300px) minmax(0, 1fr); }
  .col-controls { order: 1; }
  .col-player { order: 2; }
}
@media (min-width: 1100px) {
  .layout { grid-template-columns: minmax(0, 340px) minmax(0, 1fr); }
}

/* ---------- panel ---------- */
.panel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px;
  padding: clamp(14px, 3.2vw, 20px);
  min-width: 0;
}
.panel--accent { border-color: rgba(88,166,255,0.28); }

.panel-label {
  display: block;
  font-size: 11.5px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${c.muted};
  margin-bottom: 10px;
}
.panel-label--accent { color: ${c.accent}; }

/* ---------- tombol ---------- */
.btn {
  font: inherit;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: transparent;
  color: #e6edf3;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background .15s, border-color .15s, transform .08s;
  /* target sentuh nyaman di ponsel */
  min-height: 42px;
}
.btn:hover:not(:disabled) { background: rgba(255,255,255,0.07); }
.btn:active:not(:disabled) { transform: scale(0.98); }
.btn:focus-visible { outline: 2px solid ${c.accent}; outline-offset: 2px; }
.btn:disabled { cursor: default; opacity: .85; }

.btn--on {
  background: ${c.accent};
  border-color: ${c.accent};
  color: ${c.bg};
}
.btn--on:hover:not(:disabled) { background: ${c.accent}; }

.btn--block { width: 100%; display: block; }
.btn--primary {
  background: ${c.accent};
  border: none;
  color: ${c.bg};
  font-weight: 700;
  border-radius: 10px;
  min-height: 46px;
}
.btn--primary:disabled { background: rgba(255,255,255,0.12); color: ${c.subtle}; }

.btn--scene {
  border-radius: 10px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.btn--scene .time { opacity: .7; font-variant-numeric: tabular-nums; }

/* grup toggle caption: menumpuk kalau sempit banget */
.seg { display: flex; gap: 8px; margin-bottom: 16px; }
.seg .btn { flex: 1 1 0; padding-inline: 8px; }

/* daftar scene: 1 kolom di sidebar, 2 kolom saat lebar penuh di mobile */
.scene-list { display: grid; gap: 8px; }
@media (min-width: 420px) and (max-width: 719px) {
  .scene-list { grid-template-columns: 1fr 1fr; }
}

/* ---------- slider ---------- */
.range {
  width: 100%;
  accent-color: ${c.accent};
  height: 26px;
}

/* ---------- player ---------- */
.player-box {
  display: flex;
  justify-content: center;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}
/* Player mengisi lebar, tapi dibatasi tinggi layar supaya tidak
   memaksa scroll di laptop pendek maupun ponsel. */
.player {
  width: 100%;
  max-width: min(380px, 100%);
  aspect-ratio: 9 / 16;
  /* sisakan ruang untuk header + meta supaya player tidak terpotong */
  max-height: calc(100dvh - 260px);
}
@media (min-width: 720px) {
  .player { max-height: calc(100dvh - 200px); }
}
/* timestamp bawaan player jangan pecah jadi dua baris di layar sempit */
.player :is(span, time, div) { white-space: nowrap; }

/* Kontrol bawaan <Player> memakai tombol kecil (24x20) — terlalu mungil
   untuk jari. Perbesar target sentuhnya tanpa mengubah tampilannya. */
.player button {
  min-width: 40px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.player input[type="range"] { height: 32px; }

.player-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  color: ${c.muted};
  font-size: 12.5px;
}
.player-meta .num { font-variant-numeric: tabular-nums; }
.player-meta .right { margin-left: auto; }

/* ---------- progress & teks kecil ---------- */
.bar {
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
  margin-top: 12px;
}
.bar > i { display: block; height: 100%; background: ${c.accent}; transition: width .6s ease; }

.note { margin: 8px 0 0; font-size: 12.5px; color: ${c.muted}; line-height: 1.55; }
.note--warn { color: ${c.subtle}; }
.note--err  { color: ${c.danger}; }

.link { color: ${c.accent}; }

.code {
  display: block;
  margin-top: 8px;
  padding: 9px 11px;
  background: rgba(0,0,0,0.45);
  border-radius: 7px;
  font-size: 12px;
  color: ${c.success};
  font-family: ${theme.font.mono};
  overflow-wrap: anywhere;
}

.dl {
  display: block;
  text-align: center;
  padding: 12px 16px;
  border-radius: 10px;
  background: ${c.success};
  color: ${c.bg};
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
}
.dl:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

/* hormati preferensi pengguna yang sensitif terhadap animasi */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;
