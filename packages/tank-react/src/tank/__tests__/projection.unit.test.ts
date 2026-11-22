import type { Snapshot } from '@williamthorsen/tank';
import { describe, expect, it } from 'vitest';

import { projectAppliedBalance, projectSnapshot } from '../projection.ts';

// Capacity 100, refilling 1 unit per second.
const SNAPSHOT: Snapshot = { balance: 40, capacity: 100, refillAmount: 1, refillIntervalMs: 1000, asOf: 10_000 };

describe(projectSnapshot, () => {
  it('projects the balance and the ready time on the browser clock when the browser runs ahead', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 5000 };

    // Browser 20_000 is server 15_000: 5 s after the snapshot.
    expect(projectSnapshot(applied, 60, 20_000)).toStrictEqual({
      status: 'recharging',
      balance: 45,
      fraction: 0.45,
      readyAt: 35_000,
      msUntilReady: 15_000,
    });
  });

  it('projects on the browser clock when the browser runs behind', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: -5000 };

    // Browser 10_000 is server 15_000.
    expect(projectSnapshot(applied, 60, 10_000)).toMatchObject({ balance: 45, readyAt: 25_000, msUntilReady: 15_000 });
  });

  it('reports ready when the projected balance covers the required amount', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 0 };

    expect(projectSnapshot(applied, 40, 10_000)).toStrictEqual({
      status: 'ready',
      balance: 40,
      fraction: 0.4,
      readyAt: 10_000,
      msUntilReady: 0,
    });
  });

  it('clamps the fraction of a negative balance to 0 and includes the repayment in the wait', () => {
    const applied = { snapshot: { ...SNAPSHOT, balance: -20 }, offsetMs: 0 };

    expect(projectSnapshot(applied, 10, 10_000)).toMatchObject({
      status: 'recharging',
      balance: -20,
      fraction: 0,
      msUntilReady: 30_000,
    });
  });

  it('caps a full tank at the capacity', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 0 };

    expect(projectSnapshot(applied, 100, 1_000_000)).toMatchObject({ status: 'ready', balance: 100, fraction: 1 });
  });

  it('waits until full when the required amount equals the capacity', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 0 };

    expect(projectSnapshot(applied, 100, 10_000)).toMatchObject({ status: 'recharging', msUntilReady: 60_000 });
  });

  it('reports an infinite wait for a tank that does not refill', () => {
    const applied = { snapshot: { ...SNAPSHOT, refillAmount: 0 }, offsetMs: 0 };

    expect(projectSnapshot(applied, 60, 10_000)).toMatchObject({
      status: 'recharging',
      readyAt: Infinity,
      msUntilReady: Infinity,
    });
  });

  it.each([-1, NaN, 101])('reports a required amount of %s as an error', (required) => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 0 };

    const projection = projectSnapshot(applied, required, 15_000);

    expect(projection).toMatchObject({
      status: 'error',
      error: expect.any(RangeError),
      balance: 45,
      fraction: 0.45,
      readyAt: Infinity,
      msUntilReady: Infinity,
    });
  });
});

describe(projectAppliedBalance, () => {
  it('returns the unrounded balance at a browser time', () => {
    const applied = { snapshot: SNAPSHOT, offsetMs: 1000 };

    expect(projectAppliedBalance(applied, 11_500)).toBe(40.5);
  });
});
