import React from 'react';
import { Player, type PlayerRef } from '@rendiv/player';
import { VerticalPromo } from '@video/VerticalPromo';
import timeline from '@video/generated/timeline.json';
import { RenderPanel } from './RenderPanel';
import { EditorPanel } from './EditorPanel';
import { initialValues, toOverrides } from './editor-schema';
import { StylePanel, defaultStyle, type StyleState } from './StylePanel';
import { content } from '@video/config/content';

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
  const [frame, setFrame] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [values, setValues] = React.useState(initialValues);
  const [style, setStyle] = React.useState<StyleState>(defaultStyle);
  const [narration, setNarration] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(content.scenes.map((s) => [s.id, s.narration]))
  );

  const patchStyle = React.useCallback(
    (p: Partial<StyleState>) => setStyle((prev) => ({ ...prev, ...p })),
    []
  );

  /** narasi yang benar-benar diubah saja — dikirim ke TTS saat render */
  const narrationChanged = React.useMemo(() => {
    const out: Record<string, string> = {};
    for (const sc of content.scenes) {
      if ((narration[sc.id] ?? '') !== sc.narration) out[sc.id] = narration[sc.id] ?? '';
    }
    return out;
  }, [narration]);

  const overrides = React.useMemo(() => toOverrides(values), [values]);
  const dirty =
    Object.keys(overrides).length > 0 || Object.keys(narrationChanged).length > 0;

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

  // props untuk PREVIEW (player di browser)
  const inputProps = React.useMemo(
    () => ({
      withAudio: true,
      withCaptions: style.withCaptions,
      wordsPerChunk: style.wordsPerChunk,
      captionAnim: style.captionAnim,
      captionPos: style.captionPos,
      captionSize: style.captionSize,
      themeId: style.themeId,
      overrides,
    }),
    [style, overrides]
  );

  // props untuk RENDER — sama, plus opsi suara & narasi baru
  const renderProps = React.useMemo(
    () => ({
      ...inputProps,
      voice: style.voice,
      rate: style.rate,
      ...(Object.keys(narrationChanged).length ? { narration: narrationChanged } : {}),
    }),
    [inputProps, style.voice, style.rate, narrationChanged]
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
            onReset={() => {
              setValues(initialValues());
              setNarration(Object.fromEntries(content.scenes.map((x) => [x.id, x.narration])));
              setStyle(defaultStyle);
            }}
            dirty={dirty}
            onJump={(f) => ref.current?.seekTo(f)}
            activeSceneId={activeSceneId}
            narration={narration}
            onNarration={(id, text) => setNarration((p) => ({ ...p, [id]: text }))}
          />

          <StylePanel value={style} onChange={patchStyle} />

          <RenderPanel inputProps={renderProps} />

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
