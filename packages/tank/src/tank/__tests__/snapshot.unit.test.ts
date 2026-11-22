import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '#src/store/memory-store.ts';

import { parseSnapshot, type Snapshot } from '../snapshot.ts';
import { createTank } from '../tank.ts';

const valid: Snapshot = { balance: 42.5, capacity: 100, refillAmount: 10, refillIntervalMs: 1000, asOf: 5000 };

describe(parseSnapshot, () => {
  it('round-trips a peeked snapshot through JSON', async () => {
    const tank = createTank({
      config: { capacity: 100, refillAmount: 10, refillIntervalMs: 1000 },
      store: createMemoryStore(),
      key: 'site',
      now: () => 5000,
    });
    const snapshot = await tank.peek();
    const json = JSON.stringify(snapshot);

    expect(parseSnapshot(JSON.parse(json))).toStrictEqual(snapshot);
  });

  it('returns only the snapshot fields', () => {
    expect(parseSnapshot({ ...valid, extra: true })).toStrictEqual(valid);
  });

  it.each([null, 'snapshot', 42])('rejects a value that is not an object: %o', (value) => {
    expect(() => parseSnapshot(value)).toThrow(TypeError);
  });

  it.each<[string, Record<string, unknown>]>([
    ['balance', { balance: undefined }],
    ['balance', { balance: '42' }],
    ['asOf', { asOf: NaN }],
    ['capacity', { capacity: 0 }],
    ['refillAmount', { refillAmount: -1 }],
    ['refillIntervalMs', { refillIntervalMs: 0 }],
  ])('rejects a malformed %s: %o', (field, override) => {
    expect(() => parseSnapshot({ ...valid, ...override })).toThrow(TypeError);
    expect(() => parseSnapshot({ ...valid, ...override })).toThrow(`"${field}"`);
  });
});
