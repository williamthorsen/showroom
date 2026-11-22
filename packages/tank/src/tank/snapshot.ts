import { type BalanceState, projectBalance } from '#src/balance/balance.ts';
import type { RefillConfig } from '#src/balance/config.ts';

/** Builds the snapshot of `state` at `now`. */
export function createSnapshot(state: BalanceState | undefined, config: RefillConfig, now: number): Snapshot {
  return {
    balance: projectBalance(state, config, now),
    capacity: config.capacity,
    refillAmount: config.refillAmount,
    refillIntervalMs: config.refillIntervalMs,
    asOf: now,
  };
}

/**
 * Validates an unknown value as a snapshot and returns a new object containing only the snapshot's fields. Throws
 * `TypeError` naming the first malformed field.
 */
export function parseSnapshot(value: unknown): Snapshot {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('A snapshot must be an object');
  }
  const snapshot: Snapshot = {
    balance: readFiniteNumber(value, 'balance'),
    capacity: readFiniteNumber(value, 'capacity'),
    refillAmount: readFiniteNumber(value, 'refillAmount'),
    refillIntervalMs: readFiniteNumber(value, 'refillIntervalMs'),
    asOf: readFiniteNumber(value, 'asOf'),
  };
  if (snapshot.capacity <= 0) {
    throw new TypeError(`Snapshot field "capacity" must be greater than 0, got ${snapshot.capacity}`);
  }
  if (snapshot.refillAmount < 0) {
    throw new TypeError(`Snapshot field "refillAmount" must not be negative, got ${snapshot.refillAmount}`);
  }
  if (snapshot.refillIntervalMs <= 0) {
    throw new TypeError(`Snapshot field "refillIntervalMs" must be greater than 0, got ${snapshot.refillIntervalMs}`);
  }
  return snapshot;
}

/** The serializable view of a balance that a site sends to a browser; `asOf` is epoch milliseconds on the server. */
export interface Snapshot extends RefillConfig {
  /** The balance projected at `asOf`. */
  balance: number;
  asOf: number;
}

// region | Helpers
function readFiniteNumber(value: object, field: string): number {
  const fieldValue: unknown = Reflect.get(value, field);
  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throw new TypeError(`Snapshot field "${field}" must be a finite number, got ${String(fieldValue)}`);
  }
  return fieldValue;
}
// endregion | Helpers
