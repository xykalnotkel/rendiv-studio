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
| Situs | https://rendiv-studio.akuntiktok76y.workers.dev |
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
