import type { RefillConfig, ResolvedTankConfig } from './config.ts';

/**
 * Applies a reserve of `amount` at `now`: deducts it when the balance covers it, and otherwise refuses with the
 * shortfall and the time at which the balance will cover it. Throws `RangeError` for an amount that is negative, not
 * finite, or greater than the capacity.
 */
export function applyReserve(
  state: BalanceState | undefined,
  config: RefillConfig,
  amount: number,
  now: number,
): ReserveResult {
  assertAmount('amount', amount, config.capacity);
  const balance = projectBalance(state, config, now);
  if (balance < amount) {
    return {
      ok: false,
      reason: 'insufficient',
      shortfall: amount - balance,
      readyAt: computeReadyAt(state, config, amount, now),
    };
  }
  return { ok: true, state: { balance: balance - amount, updatedAt: advanceTime(state, now) } };
}

/**
 * Applies the settle of a reservation of `reserved` that consumed `actual`: refunds the difference up to the capacity,
 * or debits an overage down to the floor. Throws `RangeError` for an amount that is negative or not finite.
 */
export function applySettle(
  state: BalanceState | undefined,
  config: ResolvedTankConfig,
  reserved: number,
  actual: number,
  now: number,
): BalanceState {
  assertAmount('reserved', reserved);
  assertAmount('actual', actual);
  const balance = projectBalance(state, config, now);
  const next =
    actual <= reserved
      ? Math.min(config.capacity, balance + (reserved - actual))
      : // A balance already below the floor stays where it is rather than rising to the floor.
        Math.min(balance, Math.max(config.floor, balance - (actual - reserved)));
  return { balance: next, updatedAt: advanceTime(state, now) };
}

/** Throws `RangeError` unless `value` is a finite number from 0 to `max`. */
export function assertAmount(name: string, value: number, max = Infinity): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number of at least 0, got ${value}`);
  }
  if (value > max) {
    throw new RangeError(`${name} must not exceed the capacity of ${max}, got ${value}`);
  }
}

/** The stored state of one balance; `updatedAt` is epoch milliseconds on the server's clock. */
export interface BalanceState {
  balance: number;
  updatedAt: number;
}

/**
 * Returns the time at which the balance covers `amount`: `now` when it already does, and `Infinity` when the balance
 * is short and does not refill. Rounds the time up to a whole millisecond. Throws `RangeError` for an amount that is
 * negative, not finite, or greater than the capacity.
 */
export function computeReadyAt(
  state: BalanceState | undefined,
  config: RefillConfig,
  amount: number,
  now: number,
): number {
  assertAmount('amount', amount, config.capacity);
  const balance = projectBalance(state, config, now);
  if (state === undefined || balance >= amount) {
    return now;
  }
  if (config.refillAmount === 0) {
    return Infinity;
  }
  // The refill accrues from the stored time, which can be later than a lagging `now`.
  const refillStart = Math.max(now, state.updatedAt);
  return Math.ceil(refillStart + ((amount - balance) * config.refillIntervalMs) / config.refillAmount);
}

/** Returns the balance at `now`: the stored balance plus the refill since the stored time, capped at the capacity. */
export function projectBalance(state: BalanceState | undefined, config: RefillConfig, now: number): number {
  if (state === undefined) {
    return config.capacity;
  }
  const elapsedMs = Math.max(0, now - state.updatedAt);
  return Math.min(config.capacity, state.balance + (elapsedMs * config.refillAmount) / config.refillIntervalMs);
}

/** The outcome of a reserve: the state after the deduction, or a refusal. */
export type ReserveResult =
  { ok: true; state: BalanceState } | { ok: false; reason: 'insufficient'; shortfall: number; readyAt: number };

// region | Helpers
/** Returns the stored time or `now`, whichever is later, so that a lagging clock never credits an interval twice. */
function advanceTime(state: BalanceState | undefined, now: number): number {
  return state === undefined ? now : Math.max(state.updatedAt, now);
}
// endregion | Helpers
