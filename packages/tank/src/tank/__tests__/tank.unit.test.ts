import { describe, expect, it } from 'vitest';

import type { TankConfig } from '#src/balance/config.ts';
import type { BalanceStore } from '#src/store/balance-store.ts';
import { createMemoryStore } from '#src/store/memory-store.ts';

import { createTank, type CreateTankOptions, TankContentionError } from '../tank.ts';

// Regains 10 per second, up to 100.
const config: TankConfig = { capacity: 100, refillAmount: 10, refillIntervalMs: 1000 };
const key = 'site';

describe(createTank, () => {
  it('throws RangeError for an invalid config', () => {
    expect(() => createTank({ config: { ...config, capacity: 0 }, store: createMemoryStore(), key })).toThrow(
      RangeError,
    );
  });

  it.each([0, 1.5, NaN])('throws RangeError for maxAttempts of %s', (maxAttempts) => {
    expect(() => createTank({ config, store: createMemoryStore(), key, maxAttempts })).toThrow(RangeError);
  });
});

describe('peek', () => {
  it('reports a full balance for a key without stored state, without writing', async () => {
    const store = createMemoryStore();
    const tank = createTank({ config, store, key, now: () => 5000 });

    await expect(tank.peek()).resolves.toStrictEqual({
      balance: 100,
      capacity: 100,
      refillAmount: 10,
      refillIntervalMs: 1000,
      asOf: 5000,
    });
    await expect(store.read(key)).resolves.toBeUndefined();
  });
});

describe('reserve', () => {
  it('grants a reservation and deducts the amount', async () => {
    const { tank, store } = setUp();

    const result = await tank.reserve(30);

    expect(result).toMatchObject({ ok: true, snapshot: { balance: 70, asOf: 1000 } });
    await expect(store.read(key)).resolves.toMatchObject({ value: { balance: 70, updatedAt: 1000 } });
  });

  it('grants a reservation of 0', async () => {
    const { tank } = setUp();

    await expect(tank.reserve(0)).resolves.toMatchObject({ ok: true, snapshot: { balance: 100 } });
  });

  it('refuses with the shortfall and readyAt, without writing', async () => {
    const { tank, store } = setUp();
    await tank.reserve(80);
    const before = await store.read(key);

    const result = await tank.reserve(50);

    expect(result).toStrictEqual({
      ok: false,
      reason: 'insufficient',
      shortfall: 30,
      readyAt: 4000,
      snapshot: { balance: 20, capacity: 100, refillAmount: 10, refillIntervalMs: 1000, asOf: 1000 },
    });
    await expect(store.read(key)).resolves.toStrictEqual(before);
  });

  it.each([-1, NaN, 101])('rejects with RangeError for an amount of %s', async (amount) => {
    const { tank } = setUp();

    await expect(tank.reserve(amount)).rejects.toThrow(RangeError);
  });

  it('rejects when the store fails', async () => {
    const failure = new Error('store unavailable');
    const store: BalanceStore = { read: () => Promise.reject(failure), compareAndSet: () => Promise.resolve(true) };
    const tank = createTank({ config, store, key });

    await expect(tank.reserve(1)).rejects.toBe(failure);
  });

  it('refuses for contention when every compare-and-set fails', async () => {
    const store = withFailingWrites(createMemoryStore());
    const tank = createTank({ config, store, key, now: () => 1000, maxAttempts: 3 });

    await expect(tank.reserve(1)).resolves.toStrictEqual({
      ok: false,
      reason: 'contention',
      snapshot: { balance: 100, capacity: 100, refillAmount: 10, refillIntervalMs: 1000, asOf: 1000 },
    });
  });

  it('grants concurrent reservations only up to what the balance covers', async () => {
    const memory = createMemoryStore();
    const seed = createTank({ config, store: memory, key, now: () => 0 });
    await seed.reserve(90);
    const { store, countFailedWrites } = withWriteCounter(memory);
    const tank = createTank({ config, store, key, now: () => 0 });

    const results = await Promise.all(Array.from({ length: 20 }, () => tank.reserve(1)));

    expect(results.filter((result) => result.ok).length).toBeLessThanOrEqual(10);
    expect(countFailedWrites()).toBeGreaterThan(0);
    const entry = await memory.read(key);
    expect(entry?.value.balance).toBeGreaterThanOrEqual(0);
  });
});

describe('settle', () => {
  it('refunds the reserved amount minus the actual consumption', async () => {
    const { tank } = setUp();
    const result = await reserveOrFail(tank, 30);

    await expect(result.settle(12)).resolves.toMatchObject({ balance: 88 });
  });

  it('debits an overage', async () => {
    const { tank } = setUp();
    const result = await reserveOrFail(tank, 30);

    await expect(result.settle(50)).resolves.toMatchObject({ balance: 50 });
  });

  it('refunds the whole reservation on cancel', async () => {
    const { tank } = setUp();
    const result = await reserveOrFail(tank, 30);

    await expect(result.cancel()).resolves.toMatchObject({ balance: 100 });
  });

  it('rejects a second settle or cancel, even while the first is in flight', async () => {
    const { tank } = setUp();
    const reservation = await reserveOrFail(tank, 30);

    const first = reservation.settle(10);
    await expect(reservation.cancel()).rejects.toThrow('already settled');
    await first;
    await expect(reservation.settle(10)).rejects.toThrow('already settled');
  });

  it('rejects an invalid amount without settling', async () => {
    const { tank } = setUp();
    const reservation = await reserveOrFail(tank, 30);

    await expect(reservation.settle(-1)).rejects.toThrow(RangeError);
    await expect(reservation.settle(0)).resolves.toMatchObject({ balance: 100 });
  });

  it('leaves an unsettled reservation charged at the reserved amount', async () => {
    const { tank } = setUp();
    await reserveOrFail(tank, 30);

    await expect(tank.peek()).resolves.toMatchObject({ balance: 70 });
  });

  it('rejects with TankContentionError when every compare-and-set fails, leaving the reservation charged', async () => {
    const memory = createMemoryStore();

    await expect(settleWithFailingWrites(memory, 30)).rejects.toBeInstanceOf(TankContentionError);
    await expect(memory.read(key)).resolves.toMatchObject({ value: { balance: 70 } });
  });
});

// region | Helpers
async function reserveOrFail(tank: ReturnType<typeof createTank>, amount: number) {
  const result = await tank.reserve(amount);
  if (!result.ok) {
    throw new Error(`Expected a reservation of ${amount} to be granted, got ${result.reason}`);
  }
  return result.reservation;
}

/** Grants a reservation of `amount` on a working store, then settles it in full once every write fails. */
async function settleWithFailingWrites(memory: BalanceStore, amount: number) {
  let isFailing = false;
  const store: BalanceStore = {
    read: (readKey) => memory.read(readKey),
    compareAndSet: (writeKey, expected, next) =>
      isFailing ? Promise.resolve(false) : memory.compareAndSet(writeKey, expected, next),
  };
  const tank = createTank({ config, store, key, now: () => 0, maxAttempts: 2 });
  const reservation = await reserveOrFail(tank, amount);
  isFailing = true;
  return reservation.settle(amount);
}

function setUp(overrides: Partial<CreateTankOptions> = {}) {
  const store = createMemoryStore();
  const tank = createTank({ config, store, key, now: () => 1000, ...overrides });
  return { store, tank };
}

function withFailingWrites(store: BalanceStore): BalanceStore {
  return { read: (readKey) => store.read(readKey), compareAndSet: () => Promise.resolve(false) };
}

function withWriteCounter(store: BalanceStore) {
  let failedWrites = 0;
  const counted: BalanceStore = {
    read: (readKey) => store.read(readKey),
    async compareAndSet(writeKey, expected, next) {
      const isWritten = await store.compareAndSet(writeKey, expected, next);
      if (!isWritten) {
        failedWrites += 1;
      }
      return isWritten;
    },
  };
  return { store: counted, countFailedWrites: () => failedWrites };
}
// endregion | Helpers
