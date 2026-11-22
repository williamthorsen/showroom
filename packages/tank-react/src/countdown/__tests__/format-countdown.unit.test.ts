import { cleanup, renderHook } from '@testing-library/react';
import type { Snapshot } from '@williamthorsen/tank';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTank } from '#src/tank/useTank.ts';
import { flush } from '#src/test-utils/act-timers.ts';

import { formatCountdown } from '../format-countdown.ts';

const START = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe(formatCountdown, () => {
  it.each([
    [{ status: 'recharging', msUntilReady: 222_000 }, 'Ready in 3:42'],
    [{ status: 'recharging', msUntilReady: 3_723_000 }, 'Ready in 1:02:03'],
    [{ status: 'recharging', msUntilReady: 100 }, 'Ready in 0:01'],
    [{ status: 'recharging', msUntilReady: 0 }, 'Ready in 0:01'],
    [{ status: 'recharging', msUntilReady: Infinity }, 'Not refilling'],
    [{ status: 'ready', msUntilReady: 0 }, 'Ready'],
    [{ status: 'loading', msUntilReady: undefined }, ''],
    [{ status: 'error', msUntilReady: Infinity }, ''],
  ] satisfies [Parameters<typeof formatCountdown>[0], string][])('writes %o as %j', (tank, text) => {
    expect(formatCountdown(tank)).toBe(text);
  });

  it('includes the time to repay a negative balance', async () => {
    // Capacity 10, refilling 1 unit per second, 4 units in debt: 4 s to repay and 4 s to cover 4 units.
    const snapshot: Snapshot = { balance: -4, capacity: 10, refillAmount: 1, refillIntervalMs: 1000, asOf: START };
    const { result } = renderHook(() => useTank({ fetchSnapshot: () => Promise.resolve(snapshot), required: 4 }));
    await flush();

    expect(formatCountdown(result.current)).toBe('Ready in 0:08');
  });
});
