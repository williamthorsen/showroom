import type { BalanceState } from '#src/balance/balance.ts';

import type { BalanceStore } from './balance-store.ts';

/** Creates a store that keeps each state in memory, for tests, playgrounds, and single-process servers. */
export function createMemoryStore(): BalanceStore {
  const entries = new Map<string, { value: BalanceState; version: number }>();

  return {
    read(key) {
      const entry = entries.get(key);
      return Promise.resolve(entry === undefined ? undefined : { value: { ...entry.value }, version: entry.version });
    },

    compareAndSet(key, expected, next) {
      const current = entries.get(key)?.version;
      if (current !== expected) {
        return Promise.resolve(false);
      }
      entries.set(key, { value: { ...next }, version: (current ?? 0) + 1 });
      return Promise.resolve(true);
    },
  };
}
