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

## Langkah 1 — Push ke GitHub

Repo git sudah saya siapkan (56 file, commit pertama sudah dibuat).

```bash
cd /home/user/demo-rendiv

# ganti USERNAME dengan username GitHub kamu
git remote add origin https://github.com/USERNAME/rendiv-studio.git
git branch -M main
git push -u origin main
```

Buat repo kosongnya dulu di https://github.com/new — **pilih Public** supaya
menit Actions tak terbatas. Jangan centang "Add README".

## Langkah 2 — Sambungkan Worker ke GitHub

Butuh Personal Access Token GitHub:

1. Buka https://github.com/settings/tokens/new
2. Note: `rendiv-render`, Expiration: sesukamu
3. Centang scope **`repo`** saja
4. Generate, salin tokennya

Lalu jalankan (dari folder `cloudflare-free`):

```bash
cd cloudflare-free
export CLOUDFLARE_API_TOKEN=<token-cloudflare-kamu>
export CLOUDFLARE_ACCOUNT_ID=a678fee6e0a026ccd2fd978cdf07806a

# 1. token GitHub (sebagai secret, tidak terlihat di config)
npx wrangler secret put GITHUB_TOKEN
#    → tempel token GitHub

# 2. secret bersama untuk callback dari Actions
npx wrangler secret put CALLBACK_SECRET
#    → isi kalimat acak apa saja, mis: "kucing-oren-makan-bakso-2026"

# 3. isi GITHUB_REPO di wrangler.jsonc → "USERNAME/rendiv-studio"
#    lalu deploy ulang
npm run deploy
```

Terakhir, daftarkan `CALLBACK_SECRET` yang sama di GitHub:
**Settings → Secrets and variables → Actions → New repository secret**
- Name: `CALLBACK_SECRET`
- Value: kalimat acak yang sama persis

## Selesai

Buka situsnya, klik **Render video ini**. Progress bar jalan, dan setelah
beberapa menit muncul tombol unduh MP4 — tautannya publik, bisa dibagikan ke
siapa saja.

Boleh tutup halamannya; job tetap berjalan di GitHub.

---

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

## 🔑 Jangan lupa

Token Cloudflare kamu masih tersimpan sebagai teks biasa di
`/home/user/uploads/`. **Putar/rotate token itu** di
https://dash.cloudflare.com/profile/api-tokens setelah setup selesai.
