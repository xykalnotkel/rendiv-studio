/**
 * CONTOH POLA "TRIGGER", BUKAN RENDERER.
 * ---------------------------------------------------------------
 * Endpoint ini TIDAK me-render video. Ia hanya menerima permintaan
 * lalu meneruskannya ke worker eksternal yang punya Chromium + FFmpeg.
 *
 * Kenapa tidak render langsung di sini?
 *   - Bundle Vercel Function maks 250 MB; Chromium ~150 MB + FFmpeg ~80 MB
 *     sudah habis sebelum kode aplikasi masuk.
 *   - Durasi maks 300 s (Hobby) / 800 s (Pro). Video 37 detik di proyek ini
 *     butuh ~9 menit pada 2 vCPU — lewat batas Hobby.
 *   - Tidak ada GPU, /tmp cuma 500 MB, payload maks 4,5 MB.
 *
 * Pola yang benar: Vercel = UI + API tipis. Render = worker terpisah
 * (VPS, Fly.io, Railway, Vercel Sandbox, atau AWS Lambda container).
 *
 * File ini sengaja tidak dipakai di build statis; hapus folder api/
 * kalau kamu hanya ingin deploy front-end.
 */

export const config = { runtime: 'nodejs' };

interface RenderRequest {
  compositionId?: string;
  inputProps?: Record<string, unknown>;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Gunakan POST' }, { status: 405 });
  }

  const workerUrl = process.env.RENDER_WORKER_URL;
  const workerToken = process.env.RENDER_WORKER_TOKEN;

  if (!workerUrl) {
    return Response.json(
      {
        error: 'RENDER_WORKER_URL belum diset',
        hint:
          'Deploy worker render (lihat worker/ di repo) lalu isi env var ini di dashboard Vercel.',
      },
      { status: 501 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as RenderRequest;

  // teruskan ke worker; worker mengembalikan jobId, klien polling statusnya
  const res = await fetch(`${workerUrl}/jobs`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(workerToken ? { authorization: `Bearer ${workerToken}` } : {}),
    },
    body: JSON.stringify({
      compositionId: body.compositionId ?? 'VerticalPromo',
      inputProps: body.inputProps ?? {},
    }),
  });

  if (!res.ok) {
    return Response.json({ error: 'Worker menolak permintaan' }, { status: 502 });
  }

  const job = await res.json();
  return Response.json({ jobId: job.id, status: 'queued' }, { status: 202 });
}
