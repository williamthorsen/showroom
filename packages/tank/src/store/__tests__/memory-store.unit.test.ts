import { describe, expect, it } from 'vitest';

import { describeStoreContract } from '#src/testing/index.ts';

import { createMemoryStore } from '../memory-store.ts';

describeStoreContract('createMemoryStore', createMemoryStore);

describe(createMemoryStore, () => {
  it('returns a copy, so that mutating a read does not change the stored state', async () => {
    const store = createMemoryStore();
    await store.compareAndSet('key', undefined, { balance: 1, updatedAt: 0 });
    const entry = await store.read('key');
    if (entry !== undefined) {
      entry.value.balance = 99;
    }

    await expect(store.read('key')).resolves.toMatchObject({ value: { balance: 1 } });
  });
});
