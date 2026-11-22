import { describe, expect, it } from 'vitest';

import type { BalanceState } from '#src/balance/balance.ts';
import type { BalanceStore } from '#src/store/balance-store.ts';

const key = 'contract';
const first: BalanceState = { balance: 10, updatedAt: 1000 };
const second: BalanceState = { balance: 7.5, updatedAt: 2000 };
const third: BalanceState = { balance: 3, updatedAt: 3000 };

/**
 * Registers the Vitest suite that every `BalanceStore` must pass, under `name`. `createStore` is called once per case
 * and must return an empty store.
 */
export function describeStoreContract(name: string, createStore: () => BalanceStore | Promise<BalanceStore>): void {
  describe(`${name} satisfies the BalanceStore contract`, () => {
    it('reads an absent key as undefined', async () => {
      const store = await createStore();

      await expect(store.read(key)).resolves.toBeUndefined();
    });

    it('sets an absent key when the expected version is undefined', async () => {
      const store = await createStore();

      await expect(store.compareAndSet(key, undefined, first)).resolves.toBe(true);
      await expect(store.read(key)).resolves.toMatchObject({ value: first });
    });

    it('refuses to set a present key when the expected version is undefined', async () => {
      const store = await createStore();
      await store.compareAndSet(key, undefined, first);

      await expect(store.compareAndSet(key, undefined, second)).resolves.toBe(false);
      await expect(store.read(key)).resolves.toMatchObject({ value: first });
    });

    it('sets a key whose version matches, and changes the version', async () => {
      const store = await createStore();
      await store.compareAndSet(key, undefined, first);
      const before = await readPresent(store);

      await expect(store.compareAndSet(key, before.version, second)).resolves.toBe(true);
      const after = await readPresent(store);
      expect(after.value).toStrictEqual(second);
      expect(after.version).not.toStrictEqual(before.version);
    });

    it('refuses a stale version and leaves the state', async () => {
      const store = await createStore();
      await store.compareAndSet(key, undefined, first);
      const stale = await readPresent(store);
      await store.compareAndSet(key, stale.version, second);

      await expect(store.compareAndSet(key, stale.version, third)).resolves.toBe(false);
      await expect(store.read(key)).resolves.toMatchObject({ value: second });
    });

    it('keeps keys independent', async () => {
      const store = await createStore();
      await store.compareAndSet(key, undefined, first);

      await expect(store.read(`${key}-other`)).resolves.toBeUndefined();
      await expect(store.compareAndSet(`${key}-other`, undefined, second)).resolves.toBe(true);
      await expect(store.read(key)).resolves.toMatchObject({ value: first });
    });

    it('lets exactly one of two concurrent writes with the same expected version succeed', async () => {
      const store = await createStore();
      await store.compareAndSet(key, undefined, first);
      const { version } = await readPresent(store);

      const results = await Promise.all([
        store.compareAndSet(key, version, second),
        store.compareAndSet(key, version, third),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      const winner = results[0] ? second : third;
      await expect(store.read(key)).resolves.toMatchObject({ value: winner });
    });

    it('lets exactly one of two concurrent writes to an absent key succeed', async () => {
      const store = await createStore();

      const results = await Promise.all([
        store.compareAndSet(key, undefined, first),
        store.compareAndSet(key, undefined, second),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
}

// region | Helpers
async function readPresent(store: BalanceStore) {
  const entry = await store.read(key);
  if (entry === undefined) {
    throw new Error(`Expected key "${key}" to be present after a successful write`);
  }
  return entry;
}
// endregion | Helpers
