import React from 'react';
import { theme } from '@video/config/theme';

const c = theme.color;

/**
 * Panel render — mode publik.
 *
 * Situs ini statis (Cloudflare Workers Free), tapi tombol render tetap
 * berfungsi untuk siapa saja tanpa perlu komputer siapa pun menyala:
 *
 *   Browser → Worker /api/jobs → GitHub Actions (runner gratis)
 *           → hasil diunggah ke GitHub Release → link unduhan
 *
 * Worker menyimpan status job di KV, panel ini tinggal polling.
 */

type Job = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  stage?: string;
  progress?: number;
  message?: string;
  error?: string;
  bytes?: number;
  videoUrl?: string;
  runUrl?: string;
};

const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: c.muted,
  marginBottom: 10,
};

export const RenderPanel: React.FC<{ inputProps: Record<string, unknown> }> = ({ inputProps }) => {
  const [job, setJob] = React.useState<Job | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState<boolean | null>(null);
  const [note, setNote] = React.useState('');

  // cek apakah render sudah dikonfigurasi di server
  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.configured)))
      .catch(() => setReady(false));
  }, []);

  // polling status job
  React.useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${job.id}`);
        if (r.ok) setJob(await r.json());
      } catch {
        /* coba lagi */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job]);

  async function start() {
    setBusy(true);
    setNote('');
    try {
      const r = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ compositionId: 'VerticalPromo', inputProps }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setJob(data);
    } catch (e) {
      setNote(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.round((job?.progress ?? 0) * 100);
  const active = job && (job.status === 'queued' || job.status === 'running');

  return (
    <div style={{ ...panel, borderColor: 'rgba(88,166,255,0.28)' }}>
      <span style={{ ...labelStyle, color: c.accent }}>Render MP4</span>

      <button
        onClick={start}
        disabled={busy || !!active || ready === false}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: 'none',
          background: active || ready === false ? 'rgba(255,255,255,0.12)' : c.accent,
          color: active || ready === false ? c.subtle : '#05070c',
          fontWeight: 700,
          fontSize: 14,
          cursor: active || ready === false ? 'default' : 'pointer',
        }}
      >
        {active
          ? `Merender… ${pct}%`
          : busy
            ? 'Mengirim…'
            : ready === false
              ? 'Render belum aktif'
              : 'Render video ini'}
      </button>

      {active && (
        <>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: `${Math.max(pct, 4)}%`,
                height: '100%',
                background: c.accent,
                transition: 'width .6s ease',
              }}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: c.muted }}>
            {job?.stage} · {job?.message}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, color: c.muted, lineHeight: 1.5 }}>
            Dirender di GitHub Actions — biasanya 3–6 menit. Boleh tutup halaman ini;
            hasilnya tetap tersimpan.
          </p>
          {job?.runUrl && (
            <a
              href={job.runUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11.5, color: c.accent }}
            >
              lihat log →
            </a>
          )}
        </>
      )}

      {job?.status === 'done' && job.videoUrl && (
        <div style={{ marginTop: 12 }}>
          <a
            href={job.videoUrl}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '11px 16px',
              borderRadius: 10,
              background: c.success,
              color: '#05070c',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            ⬇ Unduh MP4
            {job.bytes ? ` (${(job.bytes / 1024 / 1024).toFixed(1)} MB)` : ''}
          </a>
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: c.muted }}>
            tautan publik · job <code>{job.id}</code>
          </p>
        </div>
      )}

      {job?.status === 'error' && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: c.danger, lineHeight: 1.5 }}>
          Gagal: {job.error}
          {job.runUrl && (
            <>
              {' '}
              <a href={job.runUrl} target="_blank" rel="noreferrer" style={{ color: c.accent }}>
                lihat log
              </a>
            </>
          )}
        </p>
      )}

      {ready === false && (
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: c.subtle, lineHeight: 1.6 }}>
          Backend render belum tersambung. Set <code>GITHUB_REPO</code> dan secret{' '}
          <code>GITHUB_TOKEN</code> di Worker — lihat <code>DEPLOY-PUBLIK.md</code>.
        </p>
      )}

      {note && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: c.danger, lineHeight: 1.5 }}>{note}</p>
      )}
    </div>
  );
};
