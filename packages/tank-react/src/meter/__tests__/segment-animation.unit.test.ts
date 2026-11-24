import { describe, expect, it } from 'vitest';

import { describeSegmentAnimation } from '../segment-animation.ts';

describe(describeSegmentAnimation, () => {
  it('moves with a fill that starts above the required fraction', () => {
    const fill = { fromFraction: 0.6, toFraction: 1, delayMs: 0, durationMs: 4000 };

    expect(describeSegmentAnimation(fill, 0.4)).toStrictEqual(fill);
  });

  it('holds at the required fraction until a fill that starts below it reaches it', () => {
    const fill = { fromFraction: 0.2, toFraction: 1, delayMs: 0, durationMs: 8000 };

    expect(describeSegmentAnimation(fill, 0.4)).toStrictEqual({
      fromFraction: 0.4,
      toFraction: 1,
      delayMs: 2000,
      durationMs: 6000,
    });
  });

  it('adds the delay of a fill that a negative balance holds at empty', () => {
    const fill = { fromFraction: 0, toFraction: 1, delayMs: 4000, durationMs: 10_000 };

    expect(describeSegmentAnimation(fill, 0.4)).toStrictEqual({
      fromFraction: 0.4,
      toFraction: 1,
      delayMs: 8000,
      durationMs: 6000,
    });
  });

  it('holds still while the fill does not move', () => {
    const fill = { fromFraction: 0.3, toFraction: 0.3, delayMs: 0, durationMs: 0 };

    expect(describeSegmentAnimation(fill, 0.4)).toStrictEqual({
      fromFraction: 0.4,
      toFraction: 0.4,
      delayMs: 0,
      durationMs: 0,
    });
  });
});
