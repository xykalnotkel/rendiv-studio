import React from 'react';
import { setRootComponent, Composition } from '@rendiv/core';
import { VerticalPromo } from './VerticalPromo';
import { DemoLombok } from './DemoLombok';
import timeline from './generated/timeline.json';

/** Dimensi & durasi diambil dari timeline hasil generate. */
const Root: React.FC = () => (
  <>
    <Composition
      id="VerticalPromo"
      component={VerticalPromo}
      durationInFrames={timeline.durationInFrames}
      fps={timeline.fps}
      width={timeline.width}
      height={timeline.height}
    />
    <Composition
      id="DemoLombok"
      component={DemoLombok}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);

setRootComponent(Root);
