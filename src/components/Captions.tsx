import React from 'react';
import { useFrame, useCompositionConfig } from '@rendiv/core';
import { theme } from '../config/theme';

/**
 * Caption gaya TikTok dengan highlight per kata.
 *
 * Kenapa tidak pakai <CaptionRenderer> dari @rendiv/captions?
 * Di v0.2.6 komponen itu menaruh spasi DI DALAM <span> tiap kata:
 *     <span>{i > 0 ? ' ' : ''}{word}</span>
 * Saat kata aktif diberi display:inline-block (perlu untuk transform:scale),
 * spasi di depannya ikut ter-collapse sehingga kata menempel: "denganmenulis".
 * Di sini spasi ditaruh sebagai text node terpisah di luar span.
 */

export interface CaptionWord {
  text: string;
  startMs: number;
  endMs: number;
}
export interface CaptionLine {
  text: string;
  startMs: number;
  endMs: number;
  words?: CaptionWord[];
}

interface Chunk {
  words: string[];
  activeIndex: number;
  startMs: number;
  endMs: number;
}

/** Pecah caption jadi potongan kecil (default 3 kata) untuk gaya reels. */
export function buildChunks(lines: CaptionLine[], perChunk = 3): Chunk[] {
  const out: Chunk[] = [];
  for (const line of lines) {
    const ws = line.words ?? [];
    for (let i = 0; i < ws.length; i += perChunk) {
      const group = ws.slice(i, i + perChunk);
      group.forEach((w, j) => {
        out.push({
          words: group.map((g) => g.text),
          activeIndex: j,
          startMs: w.startMs,
          endMs: w.endMs,
        });
      });
    }
  }
  return out;
}

export const Captions: React.FC<{
  chunks: Chunk[];
  bottom?: number;
}> = ({ chunks, bottom = 200 }) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();
  const ms = (frame / fps) * 1000;
  const cur = chunks.find((c) => c.startMs <= ms && ms < c.endMs);
  if (!cur) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
        padding: `0 ${theme.space(9)}px`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: theme.fontSize.caption,
          fontWeight: 800,
          fontFamily: theme.font.sans,
          color: theme.color.text,
          textAlign: 'center',
          lineHeight: 1.28,
          textShadow: '0 6px 26px rgba(0,0,0,0.9)',
        }}
      >
        {cur.words.map((w, i) => (
          <React.Fragment key={i}>
            {i > 0 ? ' ' : null}
            <span
              style={
                i === cur.activeIndex
                  ? { color: theme.color.accentWarm, display: 'inline-block', transform: 'scale(1.07)' }
                  : undefined
              }
            >
              {w}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
