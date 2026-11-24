import type { MouseEvent, ReactElement, ReactNode } from 'react';

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

/** A step's call to action, which the tour renders as one of its own buttons. */
export interface TourAction {
  /** A short verb phrase in sentence case, such as "Create a project". */
  label: string;
  /** Renders the action as a link to this URL; absent, as a button. */
  href?: string | undefined;
  /**
   * Called on activation, before a link's default navigation, which it may prevent to route in-app. The tour stays open
   * unless the handler closes it.
   */
  onSelect?: ((event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void) | undefined;
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
  /** A call to action at the end of the slide. */
  action?: TourAction | undefined;
}

/** The direction of travel into a step, which decides the side from which it slides in. */
export type TourDirection = 'backward' | 'forward' | 'none';
