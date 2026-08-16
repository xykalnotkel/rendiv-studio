import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // pakai ulang komposisi & aset dari proyek video, tanpa duplikasi kode
  resolve: {
    alias: {
      '@video': path.resolve(__dirname, '../src'),
    },
  },
  publicDir: path.resolve(__dirname, '../public'),
  server: {
    host: '0.0.0.0',
    port: 4000,
    // izinkan host preview sandbox (*.e2b.app)
    allowedHosts: true,
    fs: { allow: [path.resolve(__dirname, '..')] },
    // saat dev, teruskan /api ke worker render lokal (npm run worker).
    // Di produksi Cloudflare, Worker yang melakukan proxy ini.
    proxy: {
      '/api': {
        target: process.env.RENDER_WORKER_URL ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
