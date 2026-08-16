import React from 'react';
import { useFrame, useCompositionConfig, Fill, interpolate } from '@rendiv/core';
import { theme } from '../config/theme';

/** Latar bergerak: gradasi hue + dua orb blur + grid halus. */
export const Backdrop: React.FC<{ hueFrom?: number; hueTo?: number; bg?: string }> = ({
  hueFrom = 205,
  hueTo = 285,
  bg,
}) => {
  const frame = useFrame();
  const { durationInFrames } = useCompositionConfig();
  const hue = interpolate(frame, [0, durationInFrames], [hueFrom, hueTo]);
  const drift = interpolate(frame, [0, durationInFrames], [0, -160]);

  return (
    <Fill style={{ background: `linear-gradient(180deg, hsl(${hue} 45% 9%), ${bg ?? theme.color.bg} 65%)` }}>
      <div
        style={{
          position: 'absolute',
          top: 300 + drift,
          left: -180,
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, hsl(${hue} 80% 45% / 0.30), transparent 68%)`,
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 200 - drift,
          right: -200,
          width: 720,
          height: 720,
          borderRadius: '50%',
          background: `radial-gradient(circle, hsl(${hue + 60} 80% 50% / 0.22), transparent 68%)`,
          filter: 'blur(50px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '90px 90px',
          maskImage: 'radial-gradient(ellipse at 50% 45%, black 45%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 45%, transparent 78%)',
        }}
      />
    </Fill>
  );
};
