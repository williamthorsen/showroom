import { isValidElement, type ReactElement } from 'react';

import { TourVisualView } from './TourVisualView.tsx';
import type { TourAction, TourDirection, TourStep } from './types.ts';

export interface TourSlideProps {
  step: TourStep;
  /** The step's zero-based position in the tour. */
  index: number;
  total: number;
  direction: TourDirection;
}

/** One step of a tour, exposed as a slide with its position: eyebrow, title, lead, visual, points, and action. */
export function TourSlide({ step, index, total, direction }: TourSlideProps): ReactElement {
  const { eyebrow, title, lead, visual, points, action } = step;
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
      {action !== undefined && <ActionView action={action} />}
    </div>
  );
}

// region | Helpers

interface ActionViewProps {
  action: TourAction;
}

/** The step's call to action, as a link when it has a URL and as a button otherwise. */
function ActionView({ action }: ActionViewProps): ReactElement {
  const { label, href, onSelect } = action;
  return href === undefined ? (
    <button type="button" className="tour-button tour-step-action" data-variant="forward" onClick={onSelect}>
      {label}
    </button>
  ) : (
    <a href={href} className="tour-button tour-step-action" data-variant="forward" onClick={onSelect}>
      {label}
    </a>
  );
}

// endregion | Helpers
