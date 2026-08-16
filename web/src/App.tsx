import React from 'react';
import { Player, type PlayerRef } from '@rendiv/player';
import { VerticalPromo } from '@video/VerticalPromo';
import timeline from '@video/generated/timeline.json';
import { RenderPanel } from './RenderPanel';
import { EditorPanel } from './EditorPanel';
import { initialValues, toOverrides } from './editor-schema';

/**
 * Konfigurator + preview.
 *
 * Semua styling responsif ada di styles.ts sebagai CSS asli (media query,
 * clamp, focus-visible) — inline style tidak mendukung itu.
 *
 * Layout:
 *   < 720px  → satu kolom, player di atas agar langsung terlihat
 *   ≥ 720px  → dua kolom, kontrol di kiri
 */

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
  const [values, setValues] = React.useState(initialValues);

  const overrides = React.useMemo(() => toOverrides(values), [values]);
  const dirty = Object.keys(overrides).length > 0;

  const setField = React.useCallback((sceneId: string, key: string, v: string) => {
    setValues((prev) => ({ ...prev, [sceneId]: { ...prev[sceneId], [key]: v } }));
  }, []);

  // scene yang sedang diputar — dipakai editor untuk auto-buka bagian terkait
  const activeSceneId = React.useMemo(() => {
    const s = timeline.scenes.find(
      (x) => frame >= x.from && frame < x.from + x.durationInFrames
    );
    return s?.id ?? null;
  }, [frame]);

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
    () => ({ withCaptions, wordsPerChunk, withAudio: true, overrides }),
    [withCaptions, wordsPerChunk, overrides]
  );

  return (
    <div className="page">
      <header>
        <h1 className="head-title">
          Rendiv <span className="dim">— preview &amp; konfigurator</span>
        </h1>
        <p className="head-sub">
          Komposisi React yang sama dipakai untuk preview di browser <em>dan</em> untuk render MP4.
          <span className="long">
            {' '}
            Situs berjalan di Cloudflare Workers; rendernya dikerjakan GitHub Actions.
          </span>
        </p>
      </header>

      <div className="layout">
        {/* ---------- kontrol ---------- */}
        <div className="col-controls">
          <EditorPanel
            values={values}
            onChange={setField}
            onReset={() => setValues(initialValues())}
            dirty={dirty}
            onJump={(f) => ref.current?.seekTo(f)}
            activeSceneId={activeSceneId}
          />

          <RenderPanel inputProps={inputProps} />

          <section className="panel">
            <span className="panel-label">Caption</span>
            <div className="seg" role="group" aria-label="Tampilkan caption">
              <button
                className={`btn ${withCaptions ? 'btn--on' : ''}`}
                aria-pressed={withCaptions}
                onClick={() => setWithCaptions(true)}
              >
                Tampil
              </button>
              <button
                className={`btn ${!withCaptions ? 'btn--on' : ''}`}
                aria-pressed={!withCaptions}
                onClick={() => setWithCaptions(false)}
              >
                Sembunyikan
              </button>
            </div>

            <label className="panel-label" htmlFor="wpc">
              Kata per potongan: {wordsPerChunk}
            </label>
            <input
              id="wpc"
              className="range"
              type="range"
              min={1}
              max={6}
              value={wordsPerChunk}
              onChange={(e) => setWordsPerChunk(Number(e.target.value))}
            />
          </section>

          <section className="panel">
            <span className="panel-label">Lompat ke scene</span>
            <div className="scene-list">
              {timeline.scenes.map((s, i) => {
                const active = frame >= s.from && frame < s.from + s.durationInFrames;
                return (
                  <button
                    key={s.id}
                    className={`btn btn--scene ${active ? 'btn--on' : ''}`}
                    aria-current={active || undefined}
                    onClick={() => ref.current?.seekTo(s.from)}
                  >
                    <span>
                      {i + 1}. {s.kind}
                    </span>
                    <span className="time">{fmt(s.from, timeline.fps)}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        {/* ---------- player ---------- */}
        <div className="col-player">
          <section className="panel" style={{ padding: 'clamp(10px, 2.5vw, 16px)' }}>
            <div className="player-box">
              <div className="player">
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
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>

            <div className="player-meta">
              <span className="num">
                frame {frame} / {timeline.durationInFrames} · {fmt(frame, timeline.fps)}
              </span>
              <span className="right">{playing ? '▶ playing' : '⏸ paused'}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
