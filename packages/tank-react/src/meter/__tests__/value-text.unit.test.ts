import { describe, expect, it } from 'vitest';

import { formatDefaultValueText, type TankMeterSample } from '../value-text.ts';

const RECHARGING: TankMeterSample = { status: 'recharging', balance: 6.29, fraction: 0.629, msUntilReady: 0 };

describe(formatDefaultValueText, () => {
  it.each([
    [{ ...RECHARGING, msUntilReady: 200_000 }, '62% full, ready in about 4 minutes'],
    [{ ...RECHARGING, msUntilReady: 60_000 }, '62% full, ready in about 1 minute'],
    [{ ...RECHARGING, msUntilReady: 59_999 }, '62% full, ready in less than a minute'],
    [{ ...RECHARGING, msUntilReady: Infinity }, '62% full, not refilling'],
    [{ ...RECHARGING, status: 'ready', fraction: 0.8 }, 'Ready, 80% full'],
    [{ status: 'loading', balance: undefined, fraction: undefined, msUntilReady: undefined }, 'Loading'],
    [{ ...RECHARGING, status: 'error' }, 'Unavailable'],
  ] satisfies [TankMeterSample, string][])('writes %o as %j', (sample, text) => {
    expect(formatDefaultValueText(sample)).toBe(text);
  });
});
