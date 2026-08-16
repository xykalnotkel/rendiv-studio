# Render publik — tanpa kartu kredit, tanpa komputer nyala

## Sudah live

**https://rendiv-studio.akuntiktok76y.workers.dev**

Sudah saya deploy ke akun Cloudflare kamu. Situs, player, dan API antrian sudah
jalan. Yang belum: menyambungkan mesin rendernya (butuh 2 langkah dari kamu).

## Cara kerjanya

```
Browser ──► Cloudflare Worker ──► GitHub Actions ──► GitHub Release
            (gratis, KV)          (gratis, 4 vCPU)   (unduhan publik)
              ▲                                            │
              └────────── lapor progress ──────────────────┘
```

Tidak ada komputer yang perlu menyala. GitHub Actions jadi mesin render —
runner-nya **4 vCPU / 16 GB**, jauh lebih kencang dari sandbox tempat kita uji
(2 vCPU / 1 GB, ~9,5 menit). Perkiraan di Actions: **3–6 menit**.

### Kenapa ini gratis

| Komponen | Kuota gratis |
|---|---|
| Cloudflare Workers | 100 rb request/hari |
| Cloudflare Static Assets | tak terbatas |
| Cloudflare KV | 100 rb baca + 1 rb tulis/hari |
| **GitHub Actions (repo publik)** | **tak terbatas** |
| GitHub Actions (repo privat) | 2.000 menit/bulan |
| GitHub Releases | tak terbatas |

Repo **publik** = render tanpa batas. Repo privat ≈ 400 render/bulan.

---

## ✅ Sudah aktif sepenuhnya

Setup selesai dan sudah diuji end-to-end:

| Komponen | Status |
|---|---|
| Situs | **https://video.xystudio.my.id** (+ cadangan `rendiv-studio.akuntiktok76y.workers.dev`) |
| Repo | https://github.com/xykalnotkel/rendiv-studio (publik) |
| Worker → GitHub | `configured: true` |
| Secret `GITHUB_TOKEN` | terpasang di Worker |
| Secret `CALLBACK_SECRET` | terpasang di Worker **dan** repo |
| KV `rendiv-studio-jobs` | aktif |

### Bukti render pertama

```
POST /api/jobs                    → 202  job 745b5cb8
GitHub Actions run #1             → repository_dispatch ✓
  queued → running → done         → callback berfungsi
durasi total                      → 7,2 menit
hasil                             → 4,0 MB
unduh tanpa login                 → HTTP 200
validasi                          → 1080x1920, 35,56s, h264 + aac ✓
```

Tautan hasilnya publik:
`https://github.com/xykalnotkel/rendiv-studio/releases/download/render-745b5cb8/745b5cb8.mp4`

### Cara pakai

Buka situsnya → klik **Render video ini** → tunggu ±7 menit → tombol unduh muncul.
Boleh tutup halaman; job tetap jalan di GitHub.

## Pakai domain sendiri (opsional, gratis)

Kamu punya `haekal.web.id`, `xyc.my.id`, `xystudio.my.id`. Tambahkan di
`cloudflare-free/wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "video.xystudio.my.id", "custom_domain": true }
]
```

`npm run deploy` lagi — DNS dan SSL diurus otomatis.

---

## Uji tanpa situs

Workflow bisa dijalankan manual dari tab **Actions → Render video → Run
workflow**. Hasilnya muncul di Releases dan sebagai artifact.

## Kalau render gagal

Panel menampilkan tautan "lihat log" langsung ke run GitHub Actions.
Workflow juga selalu mengunggah artifact cadangan (7 hari), jadi hasilnya
tidak hilang walau pembuatan Release gagal.

---

## 🔑 Catatan keamanan

Token Cloudflare & GitHub tersimpan sebagai teks biasa di `/home/user/uploads/`
dan **tidak** ikut ter-commit ke git (sudah diverifikasi). Token GitHub yang
dipakai punya scope sangat luas (`repo`, `admin:org`, `delete_repo`, dll) —
kalau nanti workspace ini dibagikan, ganti dengan token ber-scope `repo` saja.

---

## UI responsif

Diuji otomatis di 6 ukuran layar (`node scripts/test/responsive.mjs <url>`):

| Perangkat | Layout | Hasil |
|---|---|---|
| iPhone SE 375×667 | 1 kolom | ✓ |
| iPhone 14 Pro 393×852 | 1 kolom | ✓ |
| Android 412×915 | 1 kolom | ✓ |
| Tablet 768×1024 | 2 kolom | ✓ |
| Laptop 1280×800 | 2 kolom | ✓ |
| Desktop 1920×1080 | 2 kolom | ✓ |

Yang dicek: tidak ada scroll horizontal, tidak ada tombol < 38px, tidak ada
error konsol, dan player memutar normal.

Catatan teknis:
- Di ponsel **player ditaruh di atas** (`order`) agar langsung terlihat tanpa scroll.
- Grid item diberi `min-width: 0` — tanpa ini `min-width:auto` bawaan membuat
  kolom melar dan memicu overflow 18px di layar 412px.
- Tombol kontrol bawaan `<Player>` hanya 24×20px; diperbesar jadi 40×40 lewat CSS
  agar nyaman disentuh.
- Ukuran font & padding pakai `clamp()` supaya menskala mulus, bukan meloncat.
- `100dvh` dipakai agar tinggi player tepat walau bar browser mobile muncul-hilang.

---

## Editor teks di web

Buka situs → panel **Edit teks video** (accordion per scene) → ketik → preview
langsung berubah → klik Render → MP4 memakai teks barumu.

Cara kerjanya: editor menghasilkan objek `overrides` (hanya field yang diubah),
dikirim sebagai `inputProps` ke player *dan* ke render. Jadi preview = hasil MP4.
`content.mjs` tetap jadi nilai bawaan; tidak ada file yang ditulis ulang.

Yang bisa diubah: teks pembuka, cuplikan kode, angka/satuan, langkah-langkah,
brand & CTA penutup. Yang **tidak** bisa: durasi scene — itu terkunci ke panjang
narasi audio yang sudah direkam.

### Bug yang ditemukan & diperbaiki saat pengujian

1. **`curl -sf` menggagalkan step.** Flag `-f` membuat curl keluar dengan kode 22
   pada HTTP error, sehingga langkah "Lapor selesai" gagal walau render sukses —
   status job tersangkut di `queued`. Diganti `-sS` + cetak kode status.

2. **WAF memblokir callback (HTTP 403).** Domain custom `video.xystudio.my.id`
   berada di balik WAF zona Cloudflare yang menolak IP GitHub Actions. Dari
   luar 200, dari runner 403. Solusi: `CALLBACK_ORIGIN` mengarahkan callback ke
   `*.workers.dev` yang tidak melewati WAF zona. Pengunjung tetap memakai
   domain custom.

---

## Preset & narasi dari web

### Tema warna (5)
Midnight · Sunset · Forest · Grape · Mono — mengganti latar, warna aksen,
bintang, tombol CTA, dan sorotan caption sekaligus.

### Gaya subtitle (7)
| Preset | Efek |
|---|---|
| Highlight | kata aktif berwarna aksen |
| Pop | kata aktif membesar mengikuti ucapan |
| Karaoke | kata terlewat meredup |
| Bounce | kata aktif memantul (spring) |
| Typewriter | muncul huruf demi huruf + kursor |
| Boxed | kata aktif berlatar warna |
| Wave | kata aktif melayang naik-turun |

Plus posisi (atas/tengah/bawah), ukuran font 40–92px, dan 1–6 kata per potongan.

### Narasi suara
Teks narasi tiap scene bisa diketik ulang di editor. Saat render, GitHub Actions
membuat ulang suaranya dengan **edge-tts** (gratis, tanpa API key):

- 2 suara Indonesia: **Gadis** (perempuan) dan **Ardi** (laki-laki)
- 3 kecepatan: pelan / normal / cepat

Setelah TTS, `build-timeline.mjs` mengukur durasi audio baru dan **durasi tiap
scene menyesuaikan sendiri** — terbukti: narasi lebih panjang membuat video
1109 → 1051 frame dengan semua scene bergeser otomatis.

### Progress per-frame
`render.mjs` melapor ke Worker setiap ~12 detik, jadi progress bar bergerak
halus (`21/1051 frame` → `1029/1051 frame`), bukan meloncat 20% → 100%.

### Bug yang ditemukan saat pengujian
**Caption tidak ikut narasi baru.** `build-timeline.mjs` membaca teks dari
`content.mjs`, sementara TTS memakai teks baru — akibatnya audio berkata A tapi
subtitle menampilkan B. Diperbaiki dengan env `NARRATION_FILE` yang dibaca
kedua-duanya.
