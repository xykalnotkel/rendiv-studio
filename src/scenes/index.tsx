import React from 'react';
import {
  useFrame,
  useCompositionConfig,
  Fill,
  interpolate,
  spring,
  Easing,
} from '@rendiv/core';
import { AnimatedText, slideUp, scramble } from '@rendiv/text';
import { shapeStar, shapeCircle } from '@rendiv/shapes';
import { theme } from '../config/theme';
import type { SceneKind } from '../config/content';

const t = theme;

/**
 * Konteks warna aksen — supaya preset tema bisa mengganti warna
 * tanpa menyentuh theme.ts (yang statis saat build).
 */
export const AccentContext = React.createContext<{ accent: string; warm: string }>({
  accent: t.color.accent,
  warm: t.color.accentWarm,
});
const useAccent = () => React.useContext(AccentContext);

/** Fade + slide masuk/keluar otomatis di tiap scene, biar transisi mulus. */
const SceneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useFrame();
  const { durationInFrames } = useCompositionConfig();
  const inOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const outOp = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 16], [26, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.easeOut,
  });
  return (
    <Fill style={{ opacity: inOp * outOp, transform: `translateY(${y}px)` }}>{children}</Fill>
  );
};

const Center: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 40 }) => (
  <Fill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap }}>
    {children}
  </Fill>
);

/* ---------------- hook ---------------- */
const HookScene: React.FC<{ lineA: string; lineB: string }> = ({ lineA, lineB }) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();
  const { accent, warm } = useAccent();
  const star = shapeStar({ points: 5, innerRadius: 40, outerRadius: 92 });
  const pop = spring({ frame, fps, config: t.spring.pop });
  const spin = interpolate(frame, [0, 200], [0, 90]);

  return (
    <Center gap={t.space(5.5)}>
      <svg
        width={190}
        height={190}
        viewBox={`0 0 ${star.width} ${star.height}`}
        style={{
          transform: `rotate(${spin}deg) scale(${pop})`,
          filter: `drop-shadow(0 0 40px ${warm}88)`,
        }}
      >
        <path d={star.d} fill={warm} />
      </svg>
      <AnimatedText
        text={lineA}
        splitBy="character"
        animation={slideUp({ distance: 44, durationInFrames: 16 })}
        stagger={2}
        style={{
          fontSize: t.fontSize.hero,
          fontWeight: 800,
          color: t.color.text,
          fontFamily: t.font.sans,
          textAlign: 'center',
        }}
      />
      <AnimatedText
        text={lineB}
        splitBy="character"
        animation={slideUp({ distance: 44, durationInFrames: 16 })}
        stagger={2}
        style={{
          fontSize: t.fontSize.hero,
          fontWeight: 800,
          color: accent,
          fontFamily: t.font.sans,
          textAlign: 'center',
          letterSpacing: 2,
        }}
      />
    </Center>
  );
};

/* ---------------- code ---------------- */
const CodeScene: React.FC<{ filename: string; lines: [string, string][] }> = ({
  filename,
  lines,
}) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();

  return (
    <Fill style={{ justifyContent: 'center', alignItems: 'center', padding: t.space(9) }}>
      <div
        style={{
          width: '100%',
          borderRadius: t.radius.lg,
          background: 'rgba(13,17,23,0.94)',
          border: `1px solid ${t.color.border}`,
          boxShadow: '0 40px 90px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '22px 28px',
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
            <div key={c} style={{ width: 18, height: 18, borderRadius: '50%', background: c }} />
          ))}
          <span
            style={{
              color: t.color.muted,
              fontFamily: t.font.mono,
              fontSize: 24,
              marginLeft: 16,
            }}
          >
            {filename}
          </span>
        </div>

        <div style={{ padding: '34px 34px 44px' }}>
          {lines.map(([kw, rest], i) => {
            const s = Math.min(
              spring({ frame: frame - 10 - i * 7, fps, config: t.spring.snappy }),
              1
            );
            return (
              <div
                key={i}
                style={{
                  fontFamily: t.font.mono,
                  fontSize: t.fontSize.code,
                  lineHeight: 1.75,
                  whiteSpace: 'pre',
                  opacity: s,
                  transform: `translateX(${(1 - s) * -26}px)`,
                }}
              >
                <span style={{ color: t.color.muted, marginRight: 22 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ color: t.color.keyword }}>{kw}</span>
                <span style={{ color: t.color.subtle }}>{rest}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Fill>
  );
};

/* ---------------- param ---------------- */
const ParamScene: React.FC<{
  label: string;
  caption: string;
  unit: string;
  values: string[];
}> = ({ label, caption, unit, values }) => {
  const frame = useFrame();
  const { fps, durationInFrames } = useCompositionConfig();

  // bagi durasi scene rata ke semua nilai — tidak ada angka ajaib
  const per = durationInFrames / values.length;
  const step = Math.min(Math.floor(frame / per), values.length - 1);
  const local = frame - step * per;
  const s = Math.min(spring({ frame: local, fps, config: t.spring.pop }), 1);
  const { accent } = useAccent();
  const palette = [accent, t.color.success, t.color.danger];
  const color = palette[step % palette.length];

  return (
    <Center gap={t.space(5)}>
      <span style={{ fontSize: t.fontSize.small, color: t.color.muted, fontFamily: t.font.mono }}>
        {label}
      </span>
      <div
        style={{ display: 'flex', alignItems: 'baseline', gap: 18, transform: `scale(${0.75 + s * 0.25})` }}
      >
        <span
          style={{
            fontSize: 230,
            fontWeight: 800,
            color,
            fontFamily: t.font.mono,
            textShadow: `0 0 70px ${color}66`,
          }}
        >
          {values[step]}
        </span>
        <span style={{ fontSize: 70, color: t.color.muted, fontFamily: t.font.mono }}>{unit}</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {values.map((v, i) => (
          <div
            key={v}
            style={{
              width: i === step ? 90 : 40,
              height: 12,
              borderRadius: 6,
              background: i === step ? palette[i % palette.length] : 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: t.fontSize.small,
          color: t.color.subtle,
          fontFamily: t.font.sans,
          marginTop: 14,
        }}
      >
        {caption}
      </span>
    </Center>
  );
};

/* ---------------- steps ---------------- */
const StepsScene: React.FC<{ steps: { icon: string; text: string }[] }> = ({ steps }) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();
  const { accent } = useAccent();

  return (
    <Fill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: t.space(5.75),
        padding: t.space(9),
      }}
    >
      {steps.map((st, i) => {
        const s = Math.min(spring({ frame: frame - 12 - i * 30, fps, config: t.spring.soft }), 1);
        return (
          <React.Fragment key={st.text}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                padding: '32px 44px',
                width: '100%',
                borderRadius: t.radius.md,
                background: t.color.surface,
                border: `1px solid ${t.color.border}`,
                opacity: s,
                transform: `translateY(${(1 - s) * 34}px) scale(${0.94 + s * 0.06})`,
              }}
            >
              <span style={{ fontSize: 66 }}>{st.icon}</span>
              <span
                style={{
                  fontSize: t.fontSize.body,
                  color: t.color.text,
                  fontFamily: t.font.sans,
                  fontWeight: 600,
                }}
              >
                {st.text}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ fontSize: 46, color: accent, opacity: s }}>↓</span>
            )}
          </React.Fragment>
        );
      })}
    </Fill>
  );
};

/* ---------------- outro ---------------- */
const OutroScene: React.FC<{ brand: string; tagline: string; cta: string }> = ({
  brand,
  tagline,
  cta,
}) => {
  const frame = useFrame();
  const { fps } = useCompositionConfig();
  const { accent } = useAccent();
  const circle = shapeCircle({ radius: 210 });
  const grow = interpolate(frame, [0, 45], [0.25, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.easeOut,
  });
  const btn = Math.min(spring({ frame: frame - 55, fps, config: t.spring.pop }), 1);

  return (
    <Center gap={t.space(4.25)}>
      <svg
        width={560}
        height={560}
        viewBox={`0 0 ${circle.width} ${circle.height}`}
        style={{ position: 'absolute', transform: `scale(${grow})`, opacity: 0.16 }}
      >
        <path d={circle.d} fill={accent} />
      </svg>
      <AnimatedText
        text={brand}
        splitBy="character"
        animation={scramble({ durationInFrames: 22 })}
        stagger={3}
        style={{
          fontSize: 128,
          letterSpacing: 16,
          color: t.color.text,
          fontFamily: t.font.mono,
          fontWeight: 800,
          zIndex: 1,
        }}
      />
      <span
        style={{ fontSize: t.fontSize.small, color: t.color.muted, fontFamily: t.font.sans, zIndex: 1 }}
      >
        {tagline}
      </span>
      <div
        style={{
          zIndex: 1,
          marginTop: 26,
          padding: '28px 54px',
          borderRadius: t.radius.pill,
          background: accent,
          transform: `scale(${btn})`,
          boxShadow: `0 20px 60px ${accent}6b`,
        }}
      >
        <span
          style={{ fontSize: t.fontSize.small, fontWeight: 700, color: t.color.bg, fontFamily: t.font.mono }}
        >
          {cta}
        </span>
      </div>
    </Center>
  );
};

/* ---------------- registry ---------------- */
const registry: Record<SceneKind, React.FC<never>> = {
  hook: HookScene as React.FC<never>,
  code: CodeScene as React.FC<never>,
  param: ParamScene as React.FC<never>,
  steps: StepsScene as React.FC<never>,
  outro: OutroScene as React.FC<never>,
};

/** Render scene berdasarkan `kind` + data dari content.ts. */
export const Scene: React.FC<{ kind: SceneKind; data?: Record<string, unknown> }> = ({
  kind,
  data,
}) => {
  const Comp = registry[kind] as React.FC<Record<string, unknown>>;
  if (!Comp) return null;
  return (
    <SceneShell>
      <Comp {...(data ?? {})} />
    </SceneShell>
  );
};
