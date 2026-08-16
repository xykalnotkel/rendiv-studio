import React from 'react';
import { Fill, CanvasElement, Sequence, Audio, staticFile, useFrame, useCompositionConfig, interpolate } from '@rendiv/core';
import { Backdrop } from './components/Backdrop';
import { Captions, buildChunks, type CaptionLine } from './components/Captions';
import { Scene } from './scenes';
import { content } from './config/content';
import { theme } from './config/theme';
import timeline from './generated/timeline.json';

export interface VerticalPromoProps {
  /** Matikan audio saat render terpisah / preview bisu */
  withAudio?: boolean;
  /** Tampilkan caption */
  withCaptions?: boolean;
  /** Jumlah kata per potongan caption */
  wordsPerChunk?: number;
}

/**
 * Komposisi digerakkan sepenuhnya oleh data:
 *   content.ts   → teks & isi tiap scene
 *   timeline.json → kapan tiap scene muncul (dihitung dari durasi audio)
 * Tidak ada nomor frame yang ditulis tangan di file ini.
 */
export const VerticalPromo: React.FC<VerticalPromoProps> = ({
  withAudio = true,
  withCaptions = true,
  wordsPerChunk = 3,
}) => {
  const frame = useFrame();
  const { durationInFrames } = useCompositionConfig();

  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 18, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const chunks = React.useMemo(
    () => buildChunks(timeline.captions as CaptionLine[], wordsPerChunk),
    [wordsPerChunk]
  );

  // cocokkan tiap entri timeline dengan isinya berdasarkan id
  const byId = React.useMemo(
    () => Object.fromEntries(content.scenes.map((s) => [s.id, s])),
    []
  );

  return (
    <CanvasElement id="VerticalPromo">
      <Fill style={{ opacity: fadeIn * fadeOut, background: theme.color.bg }}>
        {withAudio && (
          <Audio src={staticFile('narration.mp3')} endAt={timeline.narrationEndFrame} />
        )}

        <Backdrop />

        {timeline.scenes.map((s) => {
          const c = byId[s.id];
          if (!c) return null;
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames}>
              <Scene kind={c.kind} data={c.data} />
            </Sequence>
          );
        })}

        {withCaptions && <Captions chunks={chunks} />}
      </Fill>
    </CanvasElement>
  );
};
