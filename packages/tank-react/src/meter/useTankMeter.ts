import { useState } from 'react';

import type { UseTankResult } from '#src/tank/useTank.ts';

import { describeFillAnimation, type FillAnimation } from './fill-animation.ts';
import {
  formatDefaultValue,
  formatDefaultValueText,
  type TankMeterSample,
  type TankMeterValueInput,
} from './value-text.ts';

/**
 * Derives everything that a meter of any form needs from a tank: the props of the meter element, a live region that
 * announces the change to ready, and a description of the fill's animation, which restarts at each `revision`.
 */
export function useTankMeter(tank: UseTankResult, options: UseTankMeterOptions): TankMeterState {
  const {
    label,
    formatValue = formatDefaultValue,
    formatValueText = formatDefaultValueText,
    readyText = DEFAULT_READY_TEXT,
  } = options;
  const { revision, snapshot, status } = tank;
  const now = Date.now();

  // Describe the animation at the first render of each revision, so that a re-render does not restart it.
  const [described, setDescribed] = useState(() => ({ revision, animation: describeAt(tank, now) }));
  let animation = described.animation;
  if (described.revision !== revision) {
    animation = describeAt(tank, now);
    setDescribed({ revision, animation });
  }

  // Resample on a new revision and a new status, which are discrete events, and otherwise once per minute.
  const [sampled, setSampled] = useState(() => ({ sample: readSample(tank), revision, sampledAt: now }));
  let { sample } = sampled;
  if (sampled.revision !== revision || sample.status !== status || now - sampled.sampledAt >= SAMPLE_INTERVAL_MS) {
    sample = readSample(tank);
    setSampled({ sample, revision, sampledAt: now });
  }

  const [announced, setAnnounced] = useState({ status, announcement: '' });
  let { announcement } = announced;
  if (announced.status !== status) {
    announcement = announced.status === 'recharging' && status === 'ready' ? readyText : '';
    setAnnounced({ status, announcement });
  }

  const capacity = snapshot?.capacity;
  return {
    meterProps: {
      role: 'meter',
      'aria-label': label,
      'aria-valuemin': 0,
      'aria-valuemax': capacity ?? 1,
      'aria-valuenow': capacity === undefined ? 0 : Math.min(capacity, Math.max(0, sample.balance ?? 0)),
      'aria-valuetext': formatValueText(sample),
    },
    liveRegionProps: LIVE_REGION_PROPS,
    announcement,
    animation: { key: revision, ...animation },
    fraction: tank.fraction ?? 0,
    requiredFraction: readRequiredFraction(tank),
    status,
    valueLabel: formatValue({ status, balance: tank.balance, fraction: tank.fraction, capacity }),
  };
}

/** How a meter is named and how its text reads. */
export interface UseTankMeterOptions {
  /** The meter's accessible name, such as "Free conversions". */
  label: string;
  /**
   * Writes the meter's visible value, which changes on every render. The default writes the balance as a percentage
   * of the capacity, such as "62%", because a visitor cannot read the units that a site defines.
   */
  formatValue?: (input: TankMeterValueInput) => string;
  /**
   * Writes the meter's `aria-valuetext`, which changes at most once per minute between revisions and status changes.
   * The default writes English, such as "62% full, ready in about 4 minutes".
   */
  formatValueText?: (sample: TankMeterSample) => string;
  /** The live region's announcement of the change from recharging to ready; "Ready" when omitted. */
  readyText?: string;
}

/** What a meter of any form renders. */
export interface TankMeterState {
  /** The props of the element that represents the meter. */
  meterProps: {
    role: 'meter';
    'aria-label': string;
    'aria-valuemin': 0;
    'aria-valuemax': number;
    'aria-valuenow': number;
    'aria-valuetext': string;
  };
  /** The props of a live region, which is rendered from mount and contains `announcement`. */
  liveRegionProps: { role: 'status'; 'aria-live': 'polite'; 'aria-atomic': true };
  /** `readyText` after a change from recharging to ready, until the status changes again; otherwise empty. */
  announcement: string;
  /**
   * A linear fill from `fromFraction` to `toFraction`, which is a full tank unless the fill does not move. `key`
   * changes whenever the animation must restart, so a form that animates in CSS remounts the animated element on it.
   */
  animation: FillAnimation & { key: number };
  /**
   * The current fraction, from 0 to 1, for a form that renders once per second rather than animating; 0 while the
   * tank's `fraction` is `undefined`.
   */
  fraction: number;
  /** The fraction at which the next action is covered, when it is below capacity and the projection is valid. */
  requiredFraction: number | undefined;
  status: UseTankResult['status'];
  /** The meter's visible value, written by `formatValue` from the live balance. */
  valueLabel: string;
}

// region | Helpers
const DEFAULT_READY_TEXT = 'Ready';

const LIVE_REGION_PROPS: TankMeterState['liveRegionProps'] = {
  role: 'status',
  'aria-live': 'polite',
  'aria-atomic': true,
};

const SAMPLE_INTERVAL_MS = 60_000;

function describeAt(tank: UseTankResult, now: number): FillAnimation {
  const balance = tank.projectAt(now);
  if (tank.snapshot === undefined || balance === undefined) {
    return { fromFraction: 0, toFraction: 0, delayMs: 0, durationMs: 0 };
  }
  const { capacity, refillAmount, refillIntervalMs } = tank.snapshot;
  return describeFillAnimation({ balance, capacity, ratePerMs: refillAmount / refillIntervalMs });
}

/** Returns the fraction of the capacity at which the next action is covered, while the projection is valid. */
function readRequiredFraction({ required, snapshot, status }: UseTankResult): number | undefined {
  if (snapshot === undefined || required === undefined || status === 'loading' || status === 'error') {
    return undefined;
  }
  return required > 0 && required < snapshot.capacity ? required / snapshot.capacity : undefined;
}

function readSample(tank: UseTankResult): TankMeterSample {
  return { status: tank.status, balance: tank.balance, fraction: tank.fraction, msUntilReady: tank.msUntilReady };
}
// endregion | Helpers
