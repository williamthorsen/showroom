import { describe, expect, it } from 'vitest';

import { resolveConfig, type TankConfig } from '../config.ts';

const valid: TankConfig = { capacity: 100, refillAmount: 10, refillIntervalMs: 1000 };

describe(resolveConfig, () => {
  it('fills the floor with minus the capacity', () => {
    expect(resolveConfig(valid)).toStrictEqual({ ...valid, floor: -100 });
  });

  it('keeps a configured floor', () => {
    expect(resolveConfig({ ...valid, floor: 0 }).floor).toBe(0);
  });

  it('accepts a refill amount of 0', () => {
    expect(resolveConfig({ ...valid, refillAmount: 0 }).refillAmount).toBe(0);
  });

  it.each<[string, Partial<TankConfig>]>([
    ['capacity', { capacity: 0 }],
    ['capacity', { capacity: NaN }],
    ['refillAmount', { refillAmount: -1 }],
    ['refillIntervalMs', { refillIntervalMs: 0 }],
    ['refillIntervalMs', { refillIntervalMs: Infinity }],
    ['floor', { floor: 1 }],
  ])('throws RangeError naming %s for %o', (field, override) => {
    expect(() => resolveConfig({ ...valid, ...override })).toThrow(new RegExp(`^${field} `));
    expect(() => resolveConfig({ ...valid, ...override })).toThrow(RangeError);
  });
});
