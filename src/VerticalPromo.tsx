import React from 'react';
import {
  Fill,
  CanvasElement,
  Sequence,
  Audio,
  staticFile,
  useFrame,
  useCompositionConfig,
  interpolate,
} from '@rendiv/core';
import { Backdrop } from './components/Backdrop';
import { Captions, buildChunks, type CaptionLine } from './components/Captions';
import { Scene, AccentContext } from './scenes';
import { content } from './config/content';
import { theme } from './config/theme';
import { themeById, type CaptionAnim, type CaptionPos } from './config/presets';
import timeline from './generated/timeline.json';

export interface VerticalPromoProps {
  /** Matikan audio saat render terpisah / preview bisu */
  withAudio?: boolean;
  /** Tampilkan caption */
  withCaptions?: boolean;
  /** Jumlah kata per potongan caption */
  wordsPerChunk?: number;
  /**
   * Timpa isi scene tanpa menyentuh kode.
   * Bentuknya: { [sceneId]: { field: nilai } } — digabung di atas content.mjs.
   */
  overrides?: Record<string, Record<string, unknown>>;
  /** id preset tema warna */
  themeId?: string;
  /** gaya animasi caption */
  captionAnim?: CaptionAnim;
  /** posisi caption */
  captionPos?: CaptionPos;
  /** ukuran font caption (px @1080 lebar) */
  captionSize?: number;
  /**
   * Timeline hasil regenerasi narasi (kalau teks diubah & audio dibuat ulang).
   * Kalau kosong, pakai timeline.json bawaan.
   */
  timelineOverride?: typeof timeline;
  /** nama file audio di public/ (default narration.mp3) */
  audioFile?: string;
}

/**
 * Komposisi digerakkan sepenuhnya oleh data:
 *   content.mjs   → teks & isi tiap scene (bisa ditimpa `overrides`)
 *   timeline.json → kapan tiap scene muncul (dihitung dari durasi audio)
 *   presets.ts    → tema warna & gaya caption
 * Tidak ada nomor frame yang ditulis tangan di file ini.
 */
export const VerticalPromo: React.FC<VerticalPromoProps> = ({
  withAudio = true,
  withCaptions = true,
  wordsPerChunk = 3,
  overrides,
  themeId,
  captionAnim = 'highlight',
  captionPos = 'bottom',
  captionSize = 64,
  timelineOverride,
  audioFile = 'narration.mp3',
}) => {
  const frame = useFrame();
  const { durationInFrames } = useCompositionConfig();
  const tl = timelineOverride ?? timeline;
  const pal = themeById(themeId);

  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chunks = React.useMemo(
    () => buildChunks(tl.captions as CaptionLine[], wordsPerChunk),
    [tl, wordsPerChunk]
  );

  // cocokkan tiap entri timeline dengan isinya, lalu terapkan override editor
  const byId = React.useMemo(() => {
    const map = Object.fromEntries(content.scenes.map((s) => [s.id, s]));
    if (!overrides) return map;
    for (const [id, patch] of Object.entries(overrides)) {
      const base = map[id];
      if (!base || !patch) continue;
      map[id] = { ...base, data: { ...(base.data ?? {}), ...patch } };
    }
    return map;
  }, [overrides]);

  const accentValue = React.useMemo(
    () => ({ accent: pal.accent, warm: pal.accentWarm }),
    [pal.accent, pal.accentWarm]
  );

  return (
    <CanvasElement id="VerticalPromo">
      <AccentContext.Provider value={accentValue}>
        <Fill style={{ opacity: fadeIn * fadeOut, background: pal.bg }}>
          {withAudio && <Audio src={staticFile(audioFile)} endAt={tl.narrationEndFrame} />}

          <Backdrop hueFrom={pal.hueFrom} hueTo={pal.hueTo} bg={pal.bg} />

          {tl.scenes.map((s) => {
            const c = byId[s.id];
            if (!c) return null;
            return (
              <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames}>
                <Scene kind={c.kind} data={c.data} />
              </Sequence>
            );
          })}

          {withCaptions && (
            <Captions
              chunks={chunks}
              anim={captionAnim}
              pos={captionPos}
              size={captionSize}
              accent={pal.accentWarm}
            />
          )}
        </Fill>
      </AccentContext.Provider>
    </CanvasElement>
  );
};

// jaga agar theme tetap terpakai (fallback warna teks)
void theme;
