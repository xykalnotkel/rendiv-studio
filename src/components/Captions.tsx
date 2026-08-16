import React from 'react';
import { useFrame, useCompositionConfig, interpolate, spring } from '@rendiv/core';
import { theme } from '../config/theme';
import type { CaptionAnim, CaptionPos } from '../config/presets';

/**
 * Caption gaya reels dengan 7 preset animasi.
 *
 * Kenapa tidak pakai <CaptionRenderer> dari @rendiv/captions?
 * Di v0.2.6 komponen itu menaruh spasi DI DALAM <span> tiap kata:
 *     <span>{i > 0 ? ' ' : ''}{word}</span>
 * Saat kata aktif diberi display:inline-block (perlu untuk transform),
 * spasi ikut ter-collapse sehingga kata menempel: "denganmenulis".
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
  words: CaptionWord[];
  activeIndex: number;
  startMs: number;
  endMs: number;
}

/** Pecah caption jadi potongan kecil untuk gaya reels. */
export function buildChunks(lines: CaptionLine[], perChunk = 3): Chunk[] {
  const out: Chunk[] = [];
  for (const line of lines) {
    const ws = line.words ?? [];
    for (let i = 0; i < ws.length; i += perChunk) {
      const group = ws.slice(i, i + perChunk);
      group.forEach((w, j) => {
        out.push({ words: group, activeIndex: j, startMs: w.startMs, endMs: w.endMs });
      });
    }
  }
  return out;
}

const posStyle: Record<CaptionPos, React.CSSProperties> = {
  bottom: { bottom: 200 },
  center: { top: '50%', transform: 'translateY(-50%)' },
  top: { top: 240 },
};

export const Captions: React.FC<{
  chunks: Chunk[];
  anim?: CaptionAnim;
  pos?: CaptionPos;
  size?: number;
  accent?: string;
}> = ({ chunks, anim = 'highlight', pos = 'bottom', size = 64, accent = theme.color.accentWarm }) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();
  const ms = (frame / fps) * 1000;

  const idx = chunks.findIndex((c) => c.startMs <= ms && ms < c.endMs);
  if (idx < 0) return null;
  const cur = chunks[idx];

  // seberapa jauh kata aktif sudah diucapkan (0..1)
  const w = cur.words[cur.activeIndex];
  const t = w ? Math.min(Math.max((ms - w.startMs) / Math.max(w.endMs - w.startMs, 1), 0), 1) : 0;

  /* ---- typewriter: bangun teks bertahap, bukan per kata ---- */
  if (anim === 'typewriter') {
    const full = cur.words.map((x) => x.text).join(' ');
    const upto =
      cur.words.slice(0, cur.activeIndex).reduce((n, x) => n + x.text.length + 1, 0) +
      Math.round((w?.text.length ?? 0) * t);
    return (
      <Shell pos={pos}>
        <div style={baseText(size)}>
          {full.slice(0, upto)}
          <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color: accent }}>|</span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell pos={pos}>
      <div style={baseText(size)}>
        {cur.words.map((word, i) => {
          const active = i === cur.activeIndex;
          const passed = i < cur.activeIndex;
          let s: React.CSSProperties = {};

          switch (anim) {
            case 'highlight':
              s = active ? { color: accent } : {};
              break;

            case 'pop':
              s = active
                ? {
                    color: accent,
                    display: 'inline-block',
                    transform: `scale(${1 + 0.16 * Math.sin(Math.PI * t)})`,
                  }
                : {};
              break;

            case 'karaoke':
              s = active ? { color: accent } : { opacity: passed ? 0.42 : 0.72 };
              break;

            case 'bounce': {
              const b = active
                ? spring({ frame: Math.round(t * 12), fps, config: { damping: 8, stiffness: 200, mass: 0.5 } })
                : 0;
              s = active
                ? {
                    color: accent,
                    display: 'inline-block',
                    transform: `translateY(${-14 * Math.min(b, 1)}px)`,
                  }
                : {};
              break;
            }

            case 'boxed':
              s = active
                ? {
                    color: '#05070c',
                    display: 'inline-block',
                    background: accent,
                    borderRadius: 10,
                    padding: '0 12px',
                  }
                : {};
              break;

            case 'wave': {
              const y = active ? -10 * Math.sin(Math.PI * t) : 0;
              s = active
                ? { color: accent, display: 'inline-block', transform: `translateY(${y}px)` }
                : {};
              break;
            }
          }

          return (
            <React.Fragment key={i}>
              {i > 0 ? ' ' : null}
              <span style={s}>{word.text}</span>
            </React.Fragment>
          );
        })}
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ pos: CaptionPos; children: React.ReactNode }> = ({ pos, children }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      padding: `0 ${theme.space(9)}px`,
      pointerEvents: 'none',
      ...posStyle[pos],
    }}
  >
    {children}
  </div>
);

const baseText = (size: number): React.CSSProperties => ({
  fontSize: size,
  fontWeight: 800,
  fontFamily: theme.font.sans,
  color: theme.color.text,
  textAlign: 'center',
  lineHeight: 1.28,
  textShadow: '0 6px 26px rgba(0,0,0,0.9)',
});
