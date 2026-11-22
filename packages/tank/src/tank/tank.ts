import { applyReserve, applySettle, assertAmount, type BalanceState } from '#src/balance/balance.ts';
import { resolveConfig, type TankConfig } from '#src/balance/config.ts';
import type { BalanceStore, Versioned } from '#src/store/balance-store.ts';

import { createSnapshot, type Snapshot } from './snapshot.ts';

/** Creates a tank over `store` under `key`. Throws `RangeError` for an invalid config or `maxAttempts`. */
export function createTank(options: CreateTankOptions): Tank {
  const { store, key, now = Date.now, maxAttempts = 5 } = options;
  const config = resolveConfig(options.config);
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError(`maxAttempts must be an integer of at least 1, got ${maxAttempts}`);
  }

  async function peek(): Promise<Snapshot> {
    const entry = await store.read(key);
    return createSnapshot(entry?.value, config, now());
  }

  async function reserve(amount: number): Promise<TankReserveResult> {
    assertAmount('amount', amount, config.capacity);
    let entry: Versioned<BalanceState> | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      entry = await store.read(key);
      const at = now();
      const result = applyReserve(entry?.value, config, amount, at);
      if (!result.ok) {
        const { shortfall, readyAt } = result;
        return {
          ok: false,
          reason: 'insufficient',
          shortfall,
          readyAt,
          snapshot: createSnapshot(entry?.value, config, at),
        };
      }
      if (await store.compareAndSet(key, entry?.version, result.state)) {
        return { ok: true, reservation: createReservation(amount), snapshot: createSnapshot(result.state, config, at) };
      }
    }
    return { ok: false, reason: 'contention', snapshot: createSnapshot(entry?.value, config, now()) };
  }

  function createReservation(amount: number): Reservation {
    let isSettled = false;

    // Everything before the first `await` runs synchronously, so a second call made while the first is in flight
    // already finds the reservation settled.
    async function settle(actual: number): Promise<Snapshot> {
      assertAmount('actual', actual);
      if (isSettled) {
        throw new Error('The reservation is already settled or cancelled');
      }
      isSettled = true;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const entry = await store.read(key);
        const at = now();
        const next = applySettle(entry?.value, config, amount, actual, at);
        if (await store.compareAndSet(key, entry?.version, next)) {
          return createSnapshot(next, config, at);
        }
      }
      throw new TankContentionError(key, maxAttempts);
    }

    return { amount, settle, cancel: () => settle(0) };
  }

  return { peek, reserve };
}

/** The options of `createTank`. */
export interface CreateTankOptions {
  config: TankConfig;
  store: BalanceStore;
  key: string;
  /** Returns the current epoch milliseconds; `Date.now` when omitted. */
  now?: () => number;
  /** The number of read and compare-and-set rounds that an operation tries before it gives up; 5 when omitted. */
  maxAttempts?: number;
}

/** A granted reservation, which the caller settles or cancels once. */
export interface Reservation {
  readonly amount: number;
  /**
   * Settles the reservation with the amount that the action consumed. Rejects with `RangeError` for an amount that is
   * negative or not finite, without settling; with `TankContentionError` when the attempts are exhausted; with the
   * store's error when the store fails; and with `Error` when the reservation is already settled or cancelled. After
   * any rejection other than `RangeError`, the reservation stays charged at its reserved amount and cannot be settled
   * again.
   */
  settle(actual: number): Promise<Snapshot>;
  /** Refunds the whole reservation, as a settle of 0 does. */
  cancel(): Promise<Snapshot>;
}

/** A balance in a store, which grants reservations against it. */
export interface Tank {
  /** Resolves to the current snapshot without writing. */
  peek(): Promise<Snapshot>;
  /**
   * Reserves `amount` when the balance covers it. Rejects with `RangeError` for an amount that is negative, not
   * finite, or greater than the capacity, and with the store's error when the store fails.
   */
  reserve(amount: number): Promise<TankReserveResult>;
}

/** The error with which a settle rejects when every compare-and-set attempt lost to a concurrent write. */
export class TankContentionError extends Error {
  readonly key: string;
  readonly attempts: number;

  constructor(key: string, attempts: number) {
    super(`Gave up writing key "${key}" after ${attempts} attempts lost to concurrent writes`);
    this.name = 'TankContentionError';
    this.key = key;
    this.attempts = attempts;
  }
}

/** The outcome of `Tank.reserve`. */
export type TankReserveResult =
  | { ok: true; reservation: Reservation; snapshot: Snapshot }
  | { ok: false; reason: 'insufficient'; shortfall: number; readyAt: number; snapshot: Snapshot }
  | { ok: false; reason: 'contention'; snapshot: Snapshot };
