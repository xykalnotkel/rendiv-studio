# Deploy: Cloudflare vs Vercel

Ringkasan singkat: **Cloudflare bisa menjalankan seluruh aplikasi (UI + render) di satu
platform. Vercel tidak** — Vercel butuh worker eksternal untuk bagian render.

Bedanya bukan soal "Cloudflare lebih hebat", tapi karena Cloudflare punya
**Containers**, sedangkan Vercel Functions tidak bisa memuat Chromium + FFmpeg.

---

## Kenapa render tidak bisa di serverless

| Kebutuhan render | Vercel Function | Cloudflare Worker | Cloudflare Container |
|---|---|---|---|
| Jalankan binary native (FFmpeg) | ❌ | ❌ V8 isolate, bukan container | ✅ |
| Chromium ~150 MB + FFmpeg ~80 MB | ❌ batas bundle 250 MB | ❌ batas 10 MB (gzip) | ✅ hingga 20 GB disk |
| RAM | 2–4 GB | ❌ 128 MB, tidak bisa dinaikkan | ✅ hingga 12 GiB |
| Filesystem asli | /tmp 500 MB | ❌ tidak ada | ✅ |
| Waktu jalan | 300 s Hobby / 800 s Pro | 30 s–5 menit CPU | ✅ tidak ada batas per-request |

Worker Cloudflare **lebih ketat** dari Vercel Function untuk kasus ini: 128 MB memori
adalah batas keras di semua paket, dan V8 isolate tidak bisa menjalankan proses native
sama sekali. `ffmpeg.wasm` juga bukan jalan keluar — core-nya ~31 MB, melewati batas
bundle, dan runtime memblokir kompilasi WASM saat berjalan.

Container mengubah gambarannya: itu Linux container sungguhan.

---

## Arsitektur yang dipakai proyek ini

```
                    ┌──────────────── Cloudflare ────────────────┐
Browser  ──────────►│  Worker (54 KiB)                           │
                    │   ├── /            → aset statis dari edge │  gratis, tanpa
                    │   │                   (web/dist)           │  bangunkan container
                    │   └── /api/*       → teruskan ke container │
                    │                                            │
                    │  Container standard-3 (2 vCPU / 8 GiB)     │
                    │   └── scripts/render-server.mjs            │  tidur otomatis
                    │        Chromium + FFmpeg + antrian job     │  setelah 10 menit
                    └────────────────────────────────────────────┘
```

Kuncinya: **aset statis dilayani Worker, bukan container.** Container hanya bangun saat
ada permintaan render, dan tidur lagi setelahnya. Penagihan CPU berbasis pemakaian aktif,
jadi container yang menganggur nyaris tidak memakan biaya CPU.

---

## Cara deploy ke Cloudflare

Butuh Workers Paid ($5/bulan) — Containers tidak tersedia di paket gratis.

```bash
# 1. Docker harus jalan (wrangler membangun image-nya)
docker info

# 2. login sekali
cd cloudflare && npx wrangler login

# 3. build front-end + deploy Worker + Container sekaligus
npm run deploy
```

`predeploy` otomatis menjalankan build front-end, jadi satu perintah saja.

Node.js **v22+** wajib untuk wrangler (v20 ditolak).

### Menyesuaikan ukuran container

Di `cloudflare/wrangler.jsonc`, ubah `instance_type`:

| Instance | vCPU | RAM | Catatan |
|---|---|---|---|
| `standard-1` | 1/2 | 4 GiB | terlalu lambat untuk render |
| `standard-2` | 1 | 6 GiB | bisa, tapi lama |
| `standard-3` | 2 | 8 GiB | **dipakai di sini** — setara mesin uji |
| `standard-4` | 4 | 12 GiB | tercepat; maksimum yang tersedia |

Maksimum mutlak adalah 4 vCPU / 12 GiB. Kalau butuh lebih besar, gunakan VPS biasa.

---

## Cara deploy ke Vercel

Vercel tetap bisa dipakai, tapi **hanya untuk front-end**:

```bash
cd web && vercel deploy --prod
```

Untuk fitur render, arahkan `/api` ke worker eksternal — deploy `Dockerfile` ke
Fly.io / Railway / Cloud Run / VPS, lalu set env `RENDER_WORKER_URL`.
`web/api/render.ts` adalah contoh endpoint penerus (bukan renderer).

Vercel Sandbox juga opsi sah: 45 menit di Hobby, 5 jam di Pro.

---

## Menjalankan worker secara lokal

```bash
npm run worker              # http://localhost:8080
cd web && npm run dev       # /api otomatis di-proxy ke :8080
```

Endpoint worker:

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | status, jumlah antrian, spesifikasi mesin |
| POST | `/jobs` | buat job → `{ id, status }` |
| GET | `/jobs/:id` | progress real-time |
| GET | `/jobs/:id/video` | unduh MP4 |

Set `RENDER_WORKER_TOKEN` untuk mewajibkan header `Authorization: Bearer <token>`
(endpoint `/health` tetap terbuka agar healthcheck container bisa jalan).

### Hasil uji nyata di sandbox ini (2 vCPU / 1 GB)

```
POST /jobs {"compositionId":"DemoLombok"}   → 202 { id: "b1964acd" }
  running  rendering   22.1%  78/300 frame
  running  rendering   56.1%  198/300 frame
  running  encoding    86.0%  Encoding video…
  done     done       100.0%  Selesai         (60 detik)
GET  /jobs/b1964acd/video                   → 1.5 MB MP4 valid
```

---

## Perkiraan biaya

**Cloudflare** (Workers Paid $5/bulan, sudah termasuk 375 vCPU-menit + 25 GiB-jam):

Render 37 detik di `standard-3` memakan ~5 menit × 2 vCPU = ~10 vCPU-menit.
Kuota bawaan cukup untuk sekitar **35 render/bulan** sebelum kena biaya tambahan.
Di atas itu, tarifnya per detik pemakaian CPU aktif.

**Vercel**: front-end gratis di Hobby, tapi worker render tetap perlu tagihan
terpisah di platform lain.

Kalau volume render tinggi dan konstan, VPS biasa lebih murah dari keduanya.
Keunggulan Cloudflare ada pada beban yang naik-turun: scale-to-zero itu nyata.
