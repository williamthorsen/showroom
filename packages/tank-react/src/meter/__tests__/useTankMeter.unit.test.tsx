import { act, cleanup, renderHook } from '@testing-library/react';
import type { Snapshot } from '@williamthorsen/tank';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTank } from '#src/tank/useTank.ts';
import { advance, flush } from '#src/test-utils/act-timers.ts';

import { useTankMeter } from '../useTankMeter.ts';

const START = 1_000_000;

// Capacity 100, refilling 1 unit per second.
const BASE: Snapshot = { balance: 10, capacity: 100, refillAmount: 1, refillIntervalMs: 1000, asOf: START };

beforeEach(() => {
  vi.useFakeTimers({ now: START });
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe(useTankMeter, () => {
  describe('before a snapshot', () => {
    it('describes an empty, unmoving meter that is loading', () => {
      const { result } = renderMeter(() => new Promise(() => {}), 20);

      expect(result.current.meter).toStrictEqual({
        meterProps: {
          role: 'meter',
          'aria-label': 'Credits',
          'aria-valuemin': 0,
          'aria-valuemax': 1,
          'aria-valuenow': 0,
          'aria-valuetext': 'Loading',
        },
        liveRegionProps: { role: 'status', 'aria-live': 'polite', 'aria-atomic': true },
        announcement: '',
        animation: { key: 0, fromFraction: 0, delayMs: 0, durationMs: 0 },
        fraction: 0,
        requiredFraction: undefined,
        status: 'loading',
      });
    });
  });

  describe('animation', () => {
    it('describes the fill from the projected balance to full', async () => {
      const { result } = renderMeter(serve(10), 20);
      await flush();

      expect(result.current.meter.animation).toStrictEqual({
        key: 1,
        fromFraction: 0.1,
        delayMs: 0,
        durationMs: 90_000,
      });
    });

    it('keeps the description across the re-renders of one revision', async () => {
      const { result } = renderMeter(serve(10), 90);
      await flush();
      const first = result.current.meter.animation;

      await advance(3000);

      expect(result.current.meter.fraction).toBe(0.13);
      expect(result.current.meter.animation).toStrictEqual(first);
    });

    it('restarts from the projected balance at a new revision', async () => {
      const { result } = renderMeter(serve(10), 90);
      await flush();
      await advance(3000);

      act(() => result.current.tank.applySnapshot({ ...BASE, balance: -5, asOf: Date.now() }));

      expect(result.current.meter.animation).toStrictEqual({
        key: 2,
        fromFraction: 0,
        delayMs: 5000,
        durationMs: 100_000,
      });
    });
  });

  describe('value text', () => {
    it('changes at most once per minute while the status stays the same', async () => {
      const { result } = renderMeter(serve(10), 90);
      await flush();

      expect(result.current.meter.meterProps).toMatchObject({
        'aria-valuenow': 10,
        'aria-valuetext': '10% full, ready in about 2 minutes',
      });

      await advance(59_000);

      expect(result.current.meter.meterProps).toMatchObject({
        'aria-valuenow': 10,
        'aria-valuetext': '10% full, ready in about 2 minutes',
      });

      await advance(1000);

      expect(result.current.meter.meterProps).toMatchObject({
        'aria-valuenow': 70,
        'aria-valuetext': '70% full, ready in less than a minute',
      });
    });

    it('changes at once when the status changes', async () => {
      const { result } = renderMeter(serve(10), 20);
      await flush();
      await advance(10_000);

      expect(result.current.meter.meterProps['aria-valuetext']).toBe('Ready, 20% full');
    });

    it('clamps the value of a negative balance to 0', async () => {
      const { result } = renderMeter(serve(-4), 20);
      await flush();

      expect(result.current.meter.meterProps).toMatchObject({ 'aria-valuenow': 0, 'aria-valuemax': 100 });
    });

    it('takes a custom formatter', async () => {
      const { result } = renderHook(() => {
        const tank = useTank({ fetchSnapshot: serve(10), required: 20 });
        return useTankMeter(tank, {
          label: 'Credits',
          formatValueText: (sample) => `${sample.status} ${sample.balance}`,
        });
      });
      await flush();

      expect(result.current.meterProps['aria-valuetext']).toBe('recharging 10');
    });
  });

  describe('announcement', () => {
    it('announces the change from recharging to ready, and clears it when the status changes again', async () => {
      const { result } = renderMeter(serve(10), 20);
      await flush();

      expect(result.current.meter.announcement).toBe('');

      await advance(10_000);

      expect(result.current.meter.announcement).toBe('Ready');

      await advance(5000);

      expect(result.current.meter.announcement).toBe('Ready');

      act(() => result.current.tank.applySnapshot({ ...BASE, balance: 0, asOf: Date.now() }));

      expect(result.current.meter.announcement).toBe('');
    });

    it('does not announce a tank that is ready on load', async () => {
      const { result } = renderMeter(serve(50), 20);
      await flush();

      expect(result.current.meter).toMatchObject({ status: 'ready', announcement: '' });
    });

    it('announces the custom ready text', async () => {
      const { result } = renderHook(() => {
        const tank = useTank({ fetchSnapshot: serve(10), required: 20 });
        return useTankMeter(tank, { label: 'Credits', readyText: 'Prêt' });
      });
      await flush();
      await advance(10_000);

      expect(result.current.announcement).toBe('Prêt');
    });
  });

  describe('required fraction', () => {
    it('is the fraction of the capacity that the next action needs', async () => {
      const { result } = renderMeter(serve(10), 20);
      await flush();

      expect(result.current.meter.requiredFraction).toBe(0.2);
    });

    it('is undefined when the next action needs the whole capacity', async () => {
      const { result } = renderMeter(serve(10), 100);
      await flush();

      expect(result.current.meter.requiredFraction).toBeUndefined();
    });

    it('is undefined in the error status', async () => {
      const { result } = renderMeter(serve(10), 101);
      await flush();

      expect(result.current.meter).toMatchObject({ status: 'error', requiredFraction: undefined });
    });
  });
});

// region | Helpers
function renderMeter(fetchSnapshot: () => Promise<Snapshot>, required: number) {
  return renderHook(() => {
    const tank = useTank({ fetchSnapshot, required });
    return { tank, meter: useTankMeter(tank, { label: 'Credits' }) };
  });
}

// Returns a fetch that answers with the snapshot of a server that held `balanceAtStart` at `START`.
function serve(balanceAtStart: number): () => Promise<Snapshot> {
  return () => {
    const now = Date.now();
    const balance = Math.min(BASE.capacity, balanceAtStart + (now - START) / 1000);
    return Promise.resolve({ ...BASE, balance, asOf: now });
  };
}
// endregion | Helpers
