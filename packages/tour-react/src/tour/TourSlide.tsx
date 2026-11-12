import { isValidElement, type ReactElement } from 'react';

import { TourVisualView } from './TourVisualView.tsx';
import type { TourDirection, TourStep } from './types.ts';

export interface TourSlideProps {
  step: TourStep;
  /** The step's zero-based position in the tour. */
  index: number;
  total: number;
  direction: TourDirection;
}

/** One step of a tour, exposed as a slide with its position: eyebrow, title, lead, visual, and points. */
export function TourSlide({ step, index, total, direction }: TourSlideProps): ReactElement {
  const { eyebrow, title, lead, visual, points } = step;
  return (
    <div
      className="tour-slide"
      role="group"
      aria-roledescription="slide"
      aria-label={`Step ${String(index + 1)} of ${String(total)}: ${title}`}
      data-direction={direction}
    >
      <p className="tour-eyebrow">{eyebrow}</p>
      <h2 className="tour-title">{title}</h2>
      <p className="tour-lead">{lead}</p>
      {visual !== undefined &&
        (isValidElement(visual) ? (
          <div className="tour-visual" data-kind="custom">
            {visual}
          </div>
        ) : (
          <TourVisualView visual={visual} />
        ))}
      {points !== undefined && points.length > 0 && (
        <ul className="tour-points">
          {points.map((point, pointIndex) => (
            <li key={pointIndex}>{point}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
