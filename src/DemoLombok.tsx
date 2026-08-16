import React from 'react';
import {
  useFrame,
  useCompositionConfig,
  Fill,
  CanvasElement,
  Sequence,
  interpolate,
  spring,
  Easing,
} from '@rendiv/core';
import { AnimatedText, slideUp, typewriter, scramble } from '@rendiv/text';
import { shapeStar, shapeCircle } from '@rendiv/shapes';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';

/* ---------- Scene 1: judul ---------- */
const SceneTitle: React.FC = () => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();

  const pop = spring({ frame, fps, config: { damping: 13, stiffness: 110, mass: 0.8 } });
  const star = shapeStar({ points: 5, innerRadius: 48, outerRadius: 110 });
  const spin = interpolate(frame, [0, 90], [0, 180]);

  return (
    <Fill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      <svg width={240} height={240} viewBox={`0 0 ${star.width} ${star.height}`}
           style={{ transform: `rotate(${spin}deg) scale(${pop})` }}>
        <path d={star.d} fill="#ffd166" />
      </svg>

      <AnimatedText
        text="Halo dari Rendiv"
        splitBy="character"
        animation={slideUp({ distance: 40, durationInFrames: 18 })}
        stagger={2}
        style={{ fontSize: 96, fontWeight: 800, color: '#fff', fontFamily: FONT }}
      />
      <AnimatedText
        text="video ini ditulis pakai React + TypeScript"
        splitBy="word"
        animation={slideUp({ distance: 20, durationInFrames: 15 })}
        stagger={3}
        style={{ fontSize: 34, color: '#8ab4ff', fontFamily: FONT, fontWeight: 400 }}
      />
    </Fill>
  );
};

/* ---------- Scene 2: bar chart ---------- */
const bars = [
  { label: 'Tulis kode', value: 0.95, color: '#58a6ff' },
  { label: 'Render MP4', value: 0.8, color: '#3fb950' },
  { label: 'Otomatis AI', value: 1.0, color: '#f78166' },
  { label: 'Drag & drop', value: 0.08, color: '#6e7681' },
];

const SceneChart: React.FC = () => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();

  return (
    <Fill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 60 }}>
      <AnimatedText
        text="Kenapa code-first?"
        splitBy="character"
        animation={typewriter()}
        stagger={2}
        style={{ fontSize: 56, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48, height: 420 }}>
        {bars.map((b, i) => {
          const s = spring({
            frame: frame - 20 - i * 8,
            fps,
            config: { damping: 14, stiffness: 90, mass: 0.9 },
          });
          const h = 420 * b.value * s;
          return (
            <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 130,
                  height: Math.max(h, 0),
                  borderRadius: 16,
                  background: `linear-gradient(180deg, ${b.color}, ${b.color}77)`,
                  boxShadow: `0 0 40px ${b.color}55`,
                }}
              />
              <span style={{ color: '#c9d1d9', fontSize: 24, fontFamily: FONT }}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </Fill>
  );
};

/* ---------- Scene 3: outro ---------- */
const SceneOutro: React.FC = () => {
  const frame = useFrame();
  const circle = shapeCircle({ radius: 200 });
  const grow = interpolate(frame, [0, 40], [0.2, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.easeOut,
  });

  return (
    <Fill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <svg
        width={520}
        height={520}
        viewBox={`0 0 ${circle.width} ${circle.height}`}
        style={{ position: 'absolute', transform: `scale(${grow})`, opacity: 0.18 }}
      >
        <path d={circle.d} fill="#58a6ff" />
      </svg>
      <div
        style={{
          textAlign: 'center',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <AnimatedText
          text="RENDIV"
          splitBy="character"
          animation={scramble({ durationInFrames: 24 })}
          stagger={3}
          style={{ fontSize: 130, letterSpacing: 18, color: '#fff', fontFamily: 'monospace', fontWeight: 800 }}
        />
        <AnimatedText
          text="github.com/thecodacus/rendiv"
          splitBy="character"
          animation={typewriter()}
          stagger={1}
          style={{ fontSize: 30, color: '#8b949e', fontFamily: 'monospace' }}
        />
      </div>
    </Fill>
  );
};

/* ---------- Komposisi utama ---------- */
export const DemoLombok: React.FC = () => {
  const frame = useFrame();
  const { durationInFrames } = useCompositionConfig();

  const hue = interpolate(frame, [0, durationInFrames], [200, 320]);
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <CanvasElement id="DemoLombok">
      <Fill
        style={{
          background: `radial-gradient(circle at 50% 40%, hsl(${hue} 40% 14%), #05070a 70%)`,
          opacity: fadeOut,
        }}
      >
        <Sequence from={0} durationInFrames={100}>
          <SceneTitle />
        </Sequence>
        <Sequence from={100} durationInFrames={110}>
          <SceneChart />
        </Sequence>
        <Sequence from={210} durationInFrames={90}>
          <SceneOutro />
        </Sequence>
      </Fill>
    </CanvasElement>
  );
};
