import React from 'react';
import { Player, type PlayerRef } from '@rendiv/player';
import { VerticalPromo } from '@video/VerticalPromo';
import timeline from '@video/generated/timeline.json';
import { theme } from '@video/config/theme';
import { RenderPanel } from './RenderPanel';

/**
 * Konfigurator + preview.
 *
 * PENTING: halaman ini 100% statis — Player memutar komposisi React
 * langsung di browser, tanpa server sama sekali. Inilah bagian yang
 * bisa di-deploy ke Vercel apa adanya.
 *
 * Yang TIDAK bisa di sini: menghasilkan file MP4. Itu butuh Chromium
 * headless + FFmpeg, lihat catatan di panel "Render".
 */

const c = theme.color;

const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: 20,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: c.muted,
  marginBottom: 8,
};

const btn = (active = false): React.CSSProperties => ({
  padding: '9px 16px',
  borderRadius: 999,
  border: `1px solid ${active ? c.accent : 'rgba(255,255,255,0.14)'}`,
  background: active ? c.accent : 'transparent',
  color: active ? '#05070c' : '#e6edf3',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
});

function fmt(frame: number, fps: number) {
  const s = frame / fps;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function App() {
  const ref = React.useRef<PlayerRef>(null);
  const [withCaptions, setWithCaptions] = React.useState(true);
  const [wordsPerChunk, setWordsPerChunk] = React.useState(3);
  const [frame, setFrame] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: { frame: number }) => setFrame(e.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
    };
  }, []);

  const inputProps = React.useMemo(
    () => ({ withCaptions, wordsPerChunk, withAudio: true }),
    [withCaptions, wordsPerChunk]
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 80px' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 30, letterSpacing: -0.5 }}>
          Rendiv <span style={{ color: c.muted, fontWeight: 400 }}>— preview & konfigurator</span>
        </h1>
        <p style={{ color: c.muted, marginTop: 8, lineHeight: 1.6, maxWidth: 720 }}>
          Komposisi React yang sama dipakai untuk preview di browser <em>dan</em> untuk render MP4 di
          server. Halaman ini sepenuhnya statis — bisa di-deploy ke Vercel tanpa backend.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,340px) 1fr', gap: 24, alignItems: 'start' }}>
        {/* ---------- panel kiri: kontrol ---------- */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={panel}>
            <span style={label}>Caption</span>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button style={btn(withCaptions)} onClick={() => setWithCaptions(true)}>
                Tampil
              </button>
              <button style={btn(!withCaptions)} onClick={() => setWithCaptions(false)}>
                Sembunyikan
              </button>
            </div>

            <span style={label}>Kata per potongan: {wordsPerChunk}</span>
            <input
              type="range"
              min={1}
              max={6}
              value={wordsPerChunk}
              onChange={(e) => setWordsPerChunk(Number(e.target.value))}
              style={{ width: '100%', accentColor: c.accent }}
            />
          </div>

          <div style={panel}>
            <span style={label}>Lompat ke scene</span>
            <div style={{ display: 'grid', gap: 8 }}>
              {timeline.scenes.map((s, i) => {
                const active = frame >= s.from && frame < s.from + s.durationInFrames;
                return (
                  <button
                    key={s.id}
                    onClick={() => ref.current?.seekTo(s.from)}
                    style={{
                      ...btn(active),
                      borderRadius: 10,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      {i + 1}. {s.kind}
                    </span>
                    <span style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(s.from, timeline.fps)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <RenderPanel inputProps={inputProps} />
        </div>

        {/* ---------- panel kanan: player ---------- */}
        <div style={{ ...panel, padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              background: '#000',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <Player
              ref={ref}
              component={VerticalPromo as never}
              inputProps={inputProps}
              durationInFrames={timeline.durationInFrames}
              fps={timeline.fps}
              compositionWidth={timeline.width}
              compositionHeight={timeline.height}
              controls
              loop
              style={{ width: '100%', maxWidth: 380, aspectRatio: '9 / 16' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 14,
              color: c.muted,
              fontSize: 13,
            }}
          >
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              frame {frame} / {timeline.durationInFrames} · {fmt(frame, timeline.fps)}
            </span>
            <span style={{ marginLeft: 'auto' }}>{playing ? '▶ playing' : '⏸ paused'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
