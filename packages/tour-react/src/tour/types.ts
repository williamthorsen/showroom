import type { ReactElement, ReactNode } from 'react';

/** One tile of a built-in visual: an icon in a tinted circle, a label, and an optional one-line detail. */
export interface TourTile {
  icon: ReactNode;
  label: string;
  detail?: string | undefined;
}

/** A built-in diagram of tiles on a sunken panel. */
export interface TourVisual {
  kind: 'flow' | 'grid' | 'scatter';
  tiles: readonly TourTile[];
}

/** One slide of a tour. */
export interface TourStep {
  /** A short label naming the step's role, such as "Why" or "How". */
  eyebrow: string;
  title: string;
  /** One or two sentences under the title. */
  lead: string;
  /** A built-in visual, or a React element that renders in its place. */
  visual?: TourVisual | ReactElement | undefined;
  /** Three or four short bullets under the visual. */
  points?: readonly string[] | undefined;
}

/** The direction of travel into a step, which decides the side from which it slides in. */
export type TourDirection = 'backward' | 'forward' | 'none';
