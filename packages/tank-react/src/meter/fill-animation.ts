/**
 * Describes a linear fill from the fraction that `balance` represents to a full tank. A negative balance holds the fill
 * at empty for the time that the refill takes to repay it.
 */
export function describeFillAnimation(input: FillAnimationInput): FillAnimation {
  const { balance, capacity, ratePerMs } = input;
  const fromFraction = Math.min(1, Math.max(0, balance / capacity));
  if (ratePerMs <= 0 || balance >= capacity) {
    return { fromFraction, delayMs: 0, durationMs: 0 };
  }
  return {
    fromFraction,
    delayMs: balance < 0 ? -balance / ratePerMs : 0,
    durationMs: (capacity - Math.max(0, balance)) / ratePerMs,
  };
}

export interface FillAnimation {
  /** The fraction of the capacity at which the fill starts, from 0 to 1. */
  fromFraction: number;
  /** How long the fill holds at `fromFraction` before it moves. */
  delayMs: number;
  /** How long the fill takes to reach a full tank once it moves; 0 when it does not move. */
  durationMs: number;
}

export interface FillAnimationInput {
  balance: number;
  capacity: number;
  ratePerMs: number;
}
