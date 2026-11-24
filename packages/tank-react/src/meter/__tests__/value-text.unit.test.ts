import { describe, expect, it } from 'vitest';

import {
  formatDefaultRequired,
  formatDefaultValue,
  formatDefaultValueText,
  type TankMeterSample,
  type TankMeterValueInput,
} from '../value-text.ts';

const RECHARGING: TankMeterSample = { status: 'recharging', balance: 6.29, fraction: 0.629, msUntilReady: 0 };

describe(formatDefaultRequired, () => {
  it('writes the reservation as a percentage of the capacity', () => {
    expect(formatDefaultRequired(4, 10)).toBe('Needs 40%');
  });
});

describe(formatDefaultValue, () => {
  it.each([
    [{ status: 'recharging', balance: 6.29, fraction: 0.629, capacity: 10 }, '62%'],
    [{ status: 'ready', balance: 10, fraction: 1, capacity: 10 }, '100%'],
    [{ status: 'recharging', balance: 29, fraction: 0.29, capacity: 100 }, '29%'],
    [{ status: 'recharging', balance: -3, fraction: 0, capacity: 10 }, '0%'],
    [{ status: 'loading', balance: undefined, fraction: undefined, capacity: undefined }, 'Loading'],
    [{ status: 'error', balance: undefined, fraction: undefined, capacity: undefined }, 'Unavailable'],
  ] satisfies [TankMeterValueInput, string][])('writes %o as %j', (input, text) => {
    expect(formatDefaultValue(input)).toBe(text);
  });
});

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
