import { describe, expect, it } from 'vitest';

import { describeFillAnimation } from '../fill-animation.ts';

// Capacity 10, refilling 1 unit per second.
const TANK = { capacity: 10, ratePerMs: 1 / 1000 };

describe(describeFillAnimation, () => {
  it('fills from a partial balance to full over the time until full', () => {
    expect(describeFillAnimation({ ...TANK, balance: 4 })).toStrictEqual({
      fromFraction: 0.4,
      delayMs: 0,
      durationMs: 6000,
    });
  });

  it('holds a negative balance at empty until it is repaid, then fills over the whole capacity', () => {
    expect(describeFillAnimation({ ...TANK, balance: -4 })).toStrictEqual({
      fromFraction: 0,
      delayMs: 4000,
      durationMs: 10_000,
    });
  });

  it('does not move a full tank', () => {
    expect(describeFillAnimation({ ...TANK, balance: 10 })).toStrictEqual({
      fromFraction: 1,
      delayMs: 0,
      durationMs: 0,
    });
  });

  it('does not move a tank that does not refill', () => {
    expect(describeFillAnimation({ ...TANK, balance: -4, ratePerMs: 0 })).toStrictEqual({
      fromFraction: 0,
      delayMs: 0,
      durationMs: 0,
    });
  });
});
