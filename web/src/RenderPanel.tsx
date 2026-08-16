import React from 'react';

/**
 * Panel render — memicu GitHub Actions lewat Cloudflare Worker.
 *
 *   Browser → /api/jobs → Worker (KV) → repository_dispatch
 *           → GitHub Actions render → unggah ke Release
 *           → Worker dapat callback → panel ini polling statusnya
 *
 * Styling ada di styles.ts supaya responsif (media query + clamp).
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

export const RenderPanel: React.FC<{ inputProps: Record<string, unknown> }> = ({ inputProps }) => {
  const [job, setJob] = React.useState<Job | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [ready, setReady] = React.useState<boolean | null>(null);
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setReady(Boolean(d.configured)))
      .catch(() => setReady(false));
  }, []);

  React.useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/jobs/${job.id}`);
        if (r.ok) setJob(await r.json());
      } catch {
        /* coba lagi di tick berikutnya */
      }
    }, 4000);
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
  const active = Boolean(job && (job.status === 'queued' || job.status === 'running'));
  const disabled = busy || active || ready === false;

  return (
    <section className="panel panel--accent">
      <span className="panel-label panel-label--accent">Render MP4</span>

      <button className="btn btn--primary btn--block" onClick={start} disabled={disabled}>
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
            className="bar"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
          <p className="note">
            {job?.stage} · {job?.message}
          </p>
          <p className="note">
            Dirender di GitHub Actions — sekitar 7 menit. Halaman boleh ditutup, hasilnya tetap
            tersimpan.
          </p>
          {job?.runUrl && (
            <a className="link note" href={job.runUrl} target="_blank" rel="noreferrer">
              lihat log →
            </a>
          )}
        </>
      )}

      {job?.status === 'done' && job.videoUrl && (
        <div style={{ marginTop: 12 }}>
          <a className="dl" href={job.videoUrl}>
            ⬇ Unduh MP4
            {job.bytes ? ` (${(job.bytes / 1024 / 1024).toFixed(1)} MB)` : ''}
          </a>
          <p className="note">
            tautan publik · job <code>{job.id}</code>
          </p>
        </div>
      )}

      {job?.status === 'error' && (
        <p className="note note--err">
          Gagal: {job.error}
          {job.runUrl && (
            <>
              {' '}
              <a className="link" href={job.runUrl} target="_blank" rel="noreferrer">
                lihat log
              </a>
            </>
          )}
        </p>
      )}

      {ready === false && (
        <p className="note note--warn">
          Backend render belum tersambung. Set <code>GITHUB_REPO</code> dan secret{' '}
          <code>GITHUB_TOKEN</code> di Worker — lihat <code>DEPLOY-PUBLIK.md</code>.
        </p>
      )}

      {note && <p className="note note--err">{note}</p>}
    </section>
  );
};
