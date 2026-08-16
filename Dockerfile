# Worker render — untuk Cloudflare Containers / Fly.io / Railway / Cloud Run / VPS.
# BUKAN untuk serverless function (Vercel Function / Cloudflare Worker).
#
# Image Playwright sudah membawa Chromium + semua system library-nya.
# Ini penting: saat mencoba di sandbox biasa, library seperti libnss3 dan
# libatk hilang dan Chromium menolak jalan. Container menghilangkan
# seluruh kelas masalah itu.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    OUT_DIR=/tmp/rendiv-out \
    # Rendiv butuh RAM lega; sesuaikan dengan instance_type yang dipakai.
    NODE_OPTIONS=--max-old-space-size=3072 \
    # pakai Chromium bawaan image, jangan unduh ulang saat npm install
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# dependency dulu agar layer cache awet
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# regenerasi timeline + audio agar selalu sinkron dengan content.mjs
RUN npm run build:assets

EXPOSE 8080

# healthcheck dipakai platform container untuk tahu kapan siap menerima trafik
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "scripts/render-server.mjs"]
