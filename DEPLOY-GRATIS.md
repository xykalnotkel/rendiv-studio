# Deploy gratis — tanpa kartu kredit

Containers butuh Workers Paid ($5/bln + kartu). Ini alternatifnya: **situs di
Cloudflare Free, render di komputermu sendiri.** Nol biaya, nol kartu kredit.

```
   Cloudflare Workers Free                Komputermu
   ┌─────────────────────────┐            ┌──────────────────────┐
   │ situs statis (HTTPS)    │            │ npm run worker       │
   │  - preview player       │  ────────► │  Chromium + FFmpeg   │
   │  - konfigurator         │  fetch()   │  :8080               │
   │  - panel render         │  ◄──────── │  → MP4               │
   └─────────────────────────┘            └──────────────────────┘
     gratis, selalu online                 nyala saat mau render
```

Situs bisa diakses siapa saja kapan saja. Tombol render hanya berfungsi saat
worker di komputermu menyala — cukup untuk pemakaian pribadi.

---

## 1. Deploy situs (sekali saja, ±1 menit)

Butuh **Node.js v22+** (wrangler menolak v20).

```bash
cd cloudflare-free
npx wrangler login          # buka browser, izinkan
npm run deploy
```

Hasilnya: `https://rendiv-studio.akuntiktok76y.workers.dev`

`predeploy` otomatis mem-build front-end, jadi cukup satu perintah.

### Pakai domainmu sendiri (opsional, tetap gratis)

Tambahkan di `cloudflare-free/wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "video.xystudio.my.id", "custom_domain": true }
]
```

Lalu `npm run deploy` lagi. Cloudflare mengurus DNS + sertifikat SSL otomatis.

---

## 2. Nyalakan worker saat mau render

```bash
npm run worker
```

Buka situsnya, panel render akan menunjukkan titik hijau **"worker terhubung"**.
Klik **Render video ini** → progress bar jalan → tombol unduh MP4 muncul.

Kalau worker mati, titiknya merah dan panel menjelaskan cara menyalakannya —
situsnya sendiri tetap normal (preview player tetap jalan).

### Kenapa situs HTTPS boleh memanggil `http://127.0.0.1`?

Karena spesifikasi Mixed Content memperlakukan `localhost` / `127.0.0.1` sebagai
*potentially trustworthy origin*. Chrome dan Firefox mengizinkannya. Worker juga
sudah mengirim header CORS yang diperlukan — sudah diverifikasi:

```
OPTIONS /jobs  → 204
  access-control-allow-origin: *
  access-control-allow-methods: GET,POST,OPTIONS
```

Alamat worker bisa diganti lewat kolom input di panel (tersimpan di
localStorage), misalnya kalau kamu jalankan di HP lewat jaringan lokal.

---

## Hasil uji nyata

Rangkaian penuh sudah diuji di sandbox (2 vCPU / 1 GB):

```
situs statis           → HTTP 200 (index.html, narration.mp3)
POST /jobs             → 202 { id: "73de57f4" }
  running   23.8%  84/300 frame
  running   66.3%  234/300 frame
  running   86.0%  Encoding video…
  done     100.0%  Selesai              (~64 detik)
GET /jobs/:id/video    → MP4 1.5 MB, 1920x1080, h264 + aac  ✓
```

---

## Batasan yang jujur

| Hal | Kenyataan |
|---|---|
| Situs | ✅ Online 24/7, gratis, HTTPS, domain sendiri |
| Preview & konfigurator | ✅ Jalan penuh di browser siapa pun |
| Render MP4 | ⚠️ Hanya saat worker di komputermu nyala |
| Orang lain render sendiri | ❌ Tidak bisa — worker cuma di komputermu |

Kalau nanti butuh render bisa diakses publik kapan saja, barulah pertimbangkan
Workers Paid + Containers (lihat `DEPLOY.md`). Semua kodenya sudah siap; tinggal
`cd cloudflare && npm run deploy`.

---

## Alternatif gratis lain (kalau perlu render 24/7)

| Layanan | Gratis? | Kartu? | Catatan |
|---|---|---|---|
| **Komputer sendiri + Cloudflare Tunnel** | ✅ | ❌ | `cloudflared tunnel` → worker lokal dapat URL publik HTTPS |
| Oracle Cloud Always Free | ✅ | ⚠️ verifikasi | 4 vCPU ARM / 24 GB — paling kuat, tapi perlu kartu untuk daftar |
| Fly.io / Railway / Render | ⚠️ | ✅ | Free tier terbatas & umumnya minta kartu |
| GitHub Actions | ✅ | ❌ | 2000 menit/bln; render lewat workflow, hasil jadi artifact |

Opsi paling menarik tanpa kartu: **Cloudflare Tunnel**. Worker tetap di
komputermu, tapi dapat alamat HTTPS publik — jadi situs bisa memanggilnya tanpa
`localhost`. Tetap perlu komputer menyala.
