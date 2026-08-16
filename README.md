# Rendiv — video promo vertikal (data-driven)

Proyek contoh: satu komposisi React yang dipakai **dua kali** — untuk preview
interaktif di browser, dan untuk render MP4 di server.

```
src/
  config/
    content.mjs        ← SUMBER KEBENARAN: teks & isi tiap scene
    content.ts         ← tipe untuk content.mjs
    theme.ts           ← design token (warna, font, spacing, spring)
  generated/
    timeline.json      ← DIBUAT OTOMATIS, jangan diedit tangan
  components/
    Backdrop.tsx       ← latar bergerak
    Captions.tsx       ← caption per-kata (pengganti CaptionRenderer, lihat catatan)
  scenes/index.tsx     ← 5 jenis scene + registry
  VerticalPromo.tsx    ← komposisi utama (memetakan timeline → scene)
  index.tsx            ← registrasi <Composition>
scripts/
  build-timeline.mjs   ← ukur durasi audio → hasilkan timeline.json
  build-audio.mjs      ← gabung segmen narasi → public/narration.mp3
  lib/render-core.mjs  ← inti pipeline render (dipakai CLI & server)
  render.mjs           ← render CLI sekali jalan
  render-server.mjs    ← worker HTTP + antrian job
web/                   ← front-end (Vite + @rendiv/player + panel render)
cloudflare/            ← Worker + Containers (perlu Workers Paid)
cloudflare-free/       ← situs statis saja (Workers Free, tanpa kartu)
Dockerfile             ← image worker render
```

## Perintah

```bash
npm run build:assets   # timeline.json + narration.mp3 dari content.mjs
npm run studio         # Rendiv Studio (preview + timeline editor)
npm run render         # hasilkan out/promo.mp4
npm run typecheck

cd web && npm run dev  # konfigurator + player interaktif
cd web && npm run build
```

## Prinsip desain: nol angka frame hardcoded

Versi pertama proyek ini punya nomor frame yang dihitung tangan
(`<Sequence from={426} durationInFrames={247}>`). Setiap kali narasi berubah,
semuanya harus dihitung ulang — rapuh dan gampang salah.

Sekarang alurnya:

```
content.mjs  ──►  build-timeline.mjs  ──►  timeline.json  ──►  VerticalPromo.tsx
   (teks)         (ukur durasi mp3)        (frame & caption)      (render)
```

Ubah teks, jalankan `npm run build:assets`, dan durasi scene + timing caption
menyesuaikan sendiri. Hapus satu scene dari `content.mjs` → total durasi
otomatis menyusut dan scene sesudahnya bergeser.

## Deploy

| Cara | Biaya | Kartu kredit | Render MP4 |
|---|---|---|---|
| **Cloudflare Free + worker lokal** | gratis | ❌ tidak perlu | ✅ saat worker nyala |
| Cloudflare Workers Paid + Containers | $5/bln | ✅ perlu | ✅ 24/7 |
| Vercel (front-end saja) | gratis | ❌ | ❌ perlu worker eksternal |

**Tanpa kartu kredit** → [DEPLOY-GRATIS.md](DEPLOY-GRATIS.md)
```bash
cd cloudflare-free && npm run deploy   # situs statis, gratis
npm run worker                         # render di komputer sendiri
```

Perbandingan lengkap Cloudflare vs Vercel + biaya: [DEPLOY.md](DEPLOY.md)

## Worker render

```bash
npm run worker              # http://localhost:8080
cd web && npm run dev       # /api di-proxy otomatis ke worker
```

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | status & spesifikasi mesin |
| POST | `/jobs` | buat job render |
| GET | `/jobs/:id` | progress real-time |
| GET | `/jobs/:id/video` | unduh MP4 |

## Catatan bug Rendiv v0.2.6

Ditemukan saat membangun proyek ini:

1. **`<Audio>` tanpa `endAt`** → FFmpeg menerima `duration=Infinity`, render gagal.
   Selalu set `endAt` (di sini diambil dari `timeline.narrationEndFrame`).
2. **`--frames 275-549`** → FFmpeg tetap mencari `frame-000000`, jadi render
   sebagian yang tidak mulai dari 0 selalu gagal.
3. **`CaptionRenderer`** menaruh spasi di dalam `<span>` tiap kata; dengan
   `display:inline-block` pada kata aktif, spasi ter-collapse → "denganmenulis".
   Diganti `components/Captions.tsx`.
4. **`shapeStar`** butuh `outerRadius` (bukan `radius`) dan hasilnya field `.d`
   (bukan `.path`). Salah nama = SVG kosong tanpa pesan error.
5. **`Easing.cubic` tidak ada** (beda dengan Remotion). Yang tersedia:
   `easeOut`, `bounce`, `elastic`, `bezier`.
6. **FFmpeg OOM** saat encode 1100 frame + filter audio sekaligus di RAM 1 GB.
   `scripts/render.mjs` memisahkan encode video dan mux audio.

## Performa

Diukur di 2 vCPU / 1 GB RAM, **tanpa GPU**:

| Skenario | Waktu |
|---|---|
| 300 frame 1080p, default | 99 s |
| 300 frame 1080p, `--concurrency 4 --image-format jpeg --preset fast` | 50 s |
| 1109 frame 1080×1920 (video final) | ~9,5 menit |

Faktor penentu adalah **jumlah CPU core**, bukan GPU — Rendiv membuka beberapa
tab Chromium paralel. GPU hanya relevan untuk `@rendiv/three` (`--gl egl`) atau
encoder NVENC.
