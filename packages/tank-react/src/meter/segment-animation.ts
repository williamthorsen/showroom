import type { FillAnimation } from './fill-animation.ts';

/**
 * Describes the position of the reservation segment's end, which is the fill's position or the required fraction,
 * whichever is greater: The segment holds at the required fraction until the fill reaches it, then moves with the fill.
 */
export function describeSegmentAnimation(fill: FillAnimation, requiredFraction: number): FillAnimation {
  const fromFraction = Math.max(fill.fromFraction, requiredFraction);
  const toFraction = Math.max(fill.toFraction, requiredFraction);
  if (fill.durationMs <= 0 || toFraction <= fromFraction) {
    return { fromFraction, toFraction: fromFraction, delayMs: 0, durationMs: 0 };
  }
  // The segment ends when the fill ends, since a moving segment's end coincides with the fill's.
  const ratePerMs = (fill.toFraction - fill.fromFraction) / fill.durationMs;
  const delayMs = fill.delayMs + (fromFraction - fill.fromFraction) / ratePerMs;
  return { fromFraction, toFraction, delayMs, durationMs: fill.delayMs + fill.durationMs - delayMs };
}
