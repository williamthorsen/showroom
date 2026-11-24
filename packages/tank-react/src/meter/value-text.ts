import type { UseTankResult } from '#src/tank/useTank.ts';

/** Writes the default legend of a meter's reservation segment, such as "Needs 40%". */
export function formatDefaultRequired(required: number, capacity: number): string {
  return `Needs ${formatPercent(required / capacity)}`;
}

/** Writes the default visible value of a meter: the balance as a percentage of the capacity, such as "62%". */
export function formatDefaultValue(input: TankMeterValueInput): string {
  switch (input.status) {
    case 'loading':
      return 'Loading';
    case 'error':
      return 'Unavailable';
    case 'ready':
    case 'recharging':
      return formatPercent(input.fraction);
  }
}

/** Writes the default `aria-valuetext` of a meter, such as "62% full, ready in about 4 minutes". */
export function formatDefaultValueText(sample: TankMeterSample): string {
  switch (sample.status) {
    case 'loading':
      return 'Loading';
    case 'error':
      return 'Unavailable';
    case 'ready':
      return `Ready, ${formatPercent(sample.fraction)} full`;
    case 'recharging':
      return `${formatPercent(sample.fraction)} full, ${formatWait(sample.msUntilReady)}`;
  }
}

/** The fields of a tank from which a meter's value text is written, sampled at most once a minute between revisions. */
export type TankMeterSample = Pick<UseTankResult, 'status' | 'balance' | 'fraction' | 'msUntilReady'>;

/** The fields of a tank from which a meter's visible value is written, read on every render. */
export interface TankMeterValueInput extends Pick<UseTankResult, 'status' | 'balance' | 'fraction'> {
  /** The tank's capacity, for a formatter that writes an amount; `undefined` until a snapshot has arrived. */
  capacity: number | undefined;
}

// region | Helpers
const MS_PER_MINUTE = 60_000;

function formatPercent(fraction: number | undefined): string {
  // Round away the binary error first, so that a fraction of 0.29 writes 29% rather than 28%.
  return `${Math.floor(Math.round((fraction ?? 0) * 1e6) / 1e4)}%`;
}

function formatWait(msUntilReady: number | undefined): string {
  if (msUntilReady === undefined || !Number.isFinite(msUntilReady)) {
    return 'not refilling';
  }
  if (msUntilReady < MS_PER_MINUTE) {
    return 'ready in less than a minute';
  }
  const minutes = Math.ceil(msUntilReady / MS_PER_MINUTE);
  return `ready in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}
// endregion | Helpers
