/**
 * Worker Cloudflare = pintu depan tipis.
 * Container = mesin render (Chromium + FFmpeg).
 *
 * Pembagian tugas:
 *   /            → aset statis dari edge (gratis, tanpa membangunkan container)
 *   /api/render  → teruskan ke container, yang benar-benar me-render
 *
 * Kenapa Worker tidak bisa render sendiri?
 * Worker adalah V8 isolate, bukan container: tidak bisa menjalankan binary
 * native, tidak ada filesystem asli, memori dibatasi 128 MB (semua paket).
 * Container tidak punya batasan itu.
 */
import { Container, getContainer } from '@cloudflare/containers';

interface Env {
  ASSETS: Fetcher;
  RENDER_CONTAINER: DurableObjectNamespace<RenderContainer>;
}

export class RenderContainer extends Container {
  /** port yang didengarkan scripts/render-server.mjs */
  defaultPort = 8080;

  /**
   * Tidur setelah 10 menit menganggur. Penagihan CPU berbasis pemakaian
   * aktif, jadi container yang tidur praktis tidak memakan biaya CPU.
   * Beri jeda cukup panjang supaya job beruntun tidak kena cold start.
   */
  sleepAfter = '10m';

  envVars = {
    NODE_ENV: 'production',
  };

  override onStart() {
    console.log('container render menyala');
  }

  override onError(err: unknown) {
    console.error('container error:', err);
    return new Response('render container error', { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Semua yang di bawah /api diteruskan ke container.
    if (url.pathname.startsWith('/api/')) {
      // Satu instance bernama "default" agar antrian job dipakai bersama.
      // Untuk paralelisme, sebar id-nya (mis. per pengguna) supaya
      // Cloudflare menjalankan beberapa container sekaligus.
      const container = getContainer(env.RENDER_CONTAINER, 'default');

      // buang prefix /api sebelum diteruskan: /api/jobs → /jobs
      const target = new URL(request.url);
      target.pathname = url.pathname.replace(/^\/api/, '') || '/';

      return container.fetch(new Request(target, request));
    }

    // sisanya: front-end statis dari edge
    return env.ASSETS.fetch(request);
  },
};
