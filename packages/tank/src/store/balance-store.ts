import type { BalanceState } from '#src/balance/balance.ts';

/** A store's token for one written state, opaque to the tank: a counter or a hash of the state. */
export type Version = string | number;

/** A stored value with the version that a compare-and-set expects. */
export interface Versioned<T> {
  value: T;
  version: Version;
}

/** The storage that a tank runs against. Its one obligation is that `compareAndSet` is atomic. */
export interface BalanceStore {
  /** Reads the state stored under `key`, or `undefined` when the key is absent. */
  read(key: string): Promise<Versioned<BalanceState> | undefined>;
  /**
   * Writes `next` only when the stored version equals `expected`, or, when `expected` is `undefined`, only when the key
   * is absent; resolves to whether it wrote.
   */
  compareAndSet(key: string, expected: Version | undefined, next: BalanceState): Promise<boolean>;
}
