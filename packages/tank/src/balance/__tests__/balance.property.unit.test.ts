import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { applyReserve, applySettle, type BalanceState, projectBalance } from '../balance.ts';
import { resolveConfig } from '../config.ts';

const config = resolveConfig({ capacity: 100, refillAmount: 10, refillIntervalMs: 1000 });
const rate = config.refillAmount / config.refillIntervalMs;
const tolerance = 1e-9;

const timeArbitrary = fc.integer({ min: 0, max: 1_000_000 });
const amountArbitrary = fc.double({ min: 0, max: config.capacity, noNaN: true });
const operationArbitrary = fc.record({ at: timeArbitrary, reserved: amountArbitrary, actual: amountArbitrary });

describe('reserve and settle interleaved at arbitrary times', () => {
  it('keep the balance between the floor and the capacity, and never move the stored time backwards', () => {
    fc.assert(
      fc.property(fc.array(operationArbitrary, { maxLength: 50 }), (operations) => {
        let state: BalanceState | undefined;
        for (const { at, reserved, actual } of operations) {
          const previousUpdatedAt = state?.updatedAt ?? -Infinity;
          const reserve = applyReserve(state, config, reserved, at);
          if (reserve.ok) {
            state = applySettle(reserve.state, config, reserved, actual, at);
          }
          if (state === undefined) {
            continue;
          }

          expect(state.balance).toBeGreaterThanOrEqual(config.floor);
          expect(state.balance).toBeLessThanOrEqual(config.capacity);
          expect(state.updatedAt).toBeGreaterThanOrEqual(previousUpdatedAt);
        }
      }),
    );
  });

  it('never credit more refill than the time between the first write and the latest time seen', () => {
    // An actual consumption at most the reserved amount keeps the floor out of play, so every deduction is recorded.
    const consumptionArbitrary = fc
      .record({ at: timeArbitrary, reserved: amountArbitrary, fraction: fc.double({ min: 0, max: 1, noNaN: true }) })
      .map(({ at, reserved, fraction }) => ({ at, reserved, actual: reserved * fraction }));

    fc.assert(
      fc.property(fc.array(consumptionArbitrary, { minLength: 1, maxLength: 50 }), (operations) => {
        let state: BalanceState | undefined;
        let firstWriteAt: number | undefined;
        let latestAt = -Infinity;
        let consumed = 0;
        for (const { at, reserved, actual } of operations) {
          latestAt = Math.max(latestAt, at);
          const reserve = applyReserve(state, config, reserved, at);
          if (!reserve.ok) {
            continue;
          }

          firstWriteAt ??= at;
          state = applySettle(reserve.state, config, reserved, actual, at);
          consumed += actual;
        }
        const creditBound = firstWriteAt === undefined ? 0 : rate * (latestAt - firstWriteAt);

        expect(projectBalance(state, config, latestAt)).toBeLessThanOrEqual(
          config.capacity + creditBound - consumed + tolerance,
        );
      }),
    );
  });
});
