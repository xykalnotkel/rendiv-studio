import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

/**
 * PENTING — dedupe paket Rendiv & React.
 *
 * Komposisi ada di ../src dan mengimpor '@rendiv/core' dari node_modules ROOT,
 * sementara <Player> di web/ mengimpor dari web/node_modules. Dua salinan =
 * dua React Context berbeda, sehingga useCompositionConfig() di dalam Player
 * tidak menemukan provider-nya dan melempar:
 *
 *   "useCompositionConfig() must be called inside a <Composition>, <Player>…"
 *
 * Gejalanya hanya muncul saat komposisi dirender oleh Player (bukan saat
 * `rendiv render`, karena di sana cuma ada satu salinan). Alias di bawah
 * memaksa semuanya memakai satu salinan yang sama.
 */
const dedupe = [
  'react',
  'react-dom',
  '@rendiv/core',
  '@rendiv/player',
  '@rendiv/text',
  '@rendiv/shapes',
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe,
    alias: [
      { find: '@video', replacement: path.resolve(root, 'src') },
      // arahkan paket bersama ke satu salinan (milik web/)
      ...dedupe.map((pkg) => ({
        find: new RegExp(`^${pkg.replace('/', '\\/')}$`),
        replacement: path.resolve(__dirname, 'node_modules', pkg),
      })),
    ],
  },
  optimizeDeps: { include: dedupe },
  publicDir: path.resolve(root, 'public'),
  server: {
    host: '0.0.0.0',
    port: 4000,
    allowedHosts: true,
    fs: { allow: [root] },
    proxy: {
      '/api': {
        target: process.env.RENDER_WORKER_URL ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
