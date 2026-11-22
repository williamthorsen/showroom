import { describe, expect, it } from 'vitest';

import { applyReserve, applySettle, computeReadyAt, projectBalance } from '../balance.ts';
import { resolveConfig } from '../config.ts';

// Regains 10 per second, up to 100.
const config = resolveConfig({ capacity: 100, refillAmount: 10, refillIntervalMs: 1000 });

describe(projectBalance, () => {
  it('returns the capacity for a key without stored state', () => {
    expect(projectBalance(undefined, config, 5000)).toBe(100);
  });

  it('adds the refill since the stored time', () => {
    expect(projectBalance({ balance: 20, updatedAt: 1000 }, config, 3500)).toBe(45);
  });

  it('caps the balance at the capacity', () => {
    expect(projectBalance({ balance: 90, updatedAt: 1000 }, config, 60_000)).toBe(100);
  });

  it('credits nothing when now is earlier than the stored time', () => {
    expect(projectBalance({ balance: 20, updatedAt: 5000 }, config, 1000)).toBe(20);
  });

  it('keeps fractional balances', () => {
    expect(projectBalance({ balance: 0, updatedAt: 0 }, config, 150)).toBeCloseTo(1.5);
  });
});

describe(computeReadyAt, () => {
  it('returns now when the balance already covers the amount', () => {
    expect(computeReadyAt({ balance: 50, updatedAt: 0 }, config, 50, 0)).toBe(0);
  });

  it('returns the time at which the refill covers the amount', () => {
    expect(computeReadyAt({ balance: 20, updatedAt: 1000 }, config, 50, 1000)).toBe(4000);
  });

  it('counts the refill from the stored time when now lags behind it', () => {
    expect(computeReadyAt({ balance: 20, updatedAt: 5000 }, config, 50, 1000)).toBe(8000);
  });

  it('returns Infinity when the balance is short and does not refill', () => {
    const frozen = resolveConfig({ capacity: 100, refillAmount: 0, refillIntervalMs: 1000 });

    expect(computeReadyAt({ balance: 20, updatedAt: 0 }, frozen, 50, 0)).toBe(Infinity);
  });

  it('throws RangeError for an amount greater than the capacity', () => {
    expect(() => computeReadyAt(undefined, config, 101, 0)).toThrow(RangeError);
  });
});

describe(applyReserve, () => {
  it('deducts the amount from a full balance for a key without stored state', () => {
    expect(applyReserve(undefined, config, 30, 1000)).toStrictEqual({
      ok: true,
      state: { balance: 70, updatedAt: 1000 },
    });
  });

  it('deducts the amount from the projected balance', () => {
    expect(applyReserve({ balance: 20, updatedAt: 0 }, config, 25, 1000)).toStrictEqual({
      ok: true,
      state: { balance: 5, updatedAt: 1000 },
    });
  });

  it('grants a reserve of 0', () => {
    expect(applyReserve({ balance: 0, updatedAt: 0 }, config, 0, 0)).toStrictEqual({
      ok: true,
      state: { balance: 0, updatedAt: 0 },
    });
  });

  it('refuses with the shortfall and the time at which the balance covers the amount', () => {
    expect(applyReserve({ balance: 20, updatedAt: 0 }, config, 50, 1000)).toStrictEqual({
      ok: false,
      reason: 'insufficient',
      shortfall: 20,
      readyAt: 3000,
    });
  });

  it('keeps the stored time when now is earlier', () => {
    const result = applyReserve({ balance: 50, updatedAt: 5000 }, config, 10, 1000);

    expect(result).toStrictEqual({ ok: true, state: { balance: 40, updatedAt: 5000 } });
  });

  it.each([-1, NaN, Infinity, 101])('throws RangeError for an amount of %s', (amount) => {
    expect(() => applyReserve(undefined, config, amount, 0)).toThrow(RangeError);
  });
});

describe(applySettle, () => {
  it('refunds the reserved amount minus the actual consumption', () => {
    expect(applySettle({ balance: 10, updatedAt: 0 }, config, 30, 12, 0)).toStrictEqual({ balance: 28, updatedAt: 0 });
  });

  it('caps a refund at the capacity', () => {
    expect(applySettle({ balance: 90, updatedAt: 0 }, config, 30, 0, 0)).toStrictEqual({ balance: 100, updatedAt: 0 });
  });

  it('debits an overage', () => {
    expect(applySettle({ balance: 10, updatedAt: 0 }, config, 30, 50, 0)).toStrictEqual({ balance: -10, updatedAt: 0 });
  });

  it('stops an overage at the default floor of minus the capacity', () => {
    expect(applySettle({ balance: 10, updatedAt: 0 }, config, 0, 500, 0)).toStrictEqual({
      balance: -100,
      updatedAt: 0,
    });
  });

  it('stops an overage at a configured floor', () => {
    const floored = resolveConfig({ capacity: 100, refillAmount: 10, refillIntervalMs: 1000, floor: -5 });

    expect(applySettle({ balance: 10, updatedAt: 0 }, floored, 0, 500, 0)).toStrictEqual({ balance: -5, updatedAt: 0 });
  });

  it('projects the balance at now before applying the refund', () => {
    expect(applySettle({ balance: 10, updatedAt: 0 }, config, 30, 30, 2000)).toStrictEqual({
      balance: 30,
      updatedAt: 2000,
    });
  });

  it('keeps the stored time when now is earlier', () => {
    expect(applySettle({ balance: 10, updatedAt: 5000 }, config, 5, 0, 1000)).toStrictEqual({
      balance: 15,
      updatedAt: 5000,
    });
  });

  it.each([-1, NaN])('throws RangeError for an actual consumption of %s', (actual) => {
    expect(() => applySettle(undefined, config, 10, actual, 0)).toThrow(RangeError);
  });
});
