import { act, cleanup, renderHook } from '@testing-library/react';
import type { Snapshot } from '@williamthorsen/tank';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTank, type UseTankOptions } from '../useTank.ts';

const START = 1_000_000;

// Capacity 100, refilling 1 unit per second.
const BASE: Snapshot = { balance: 40, capacity: 100, refillAmount: 1, refillIntervalMs: 1000, asOf: START };

beforeEach(() => {
  vi.useFakeTimers({ now: START });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  setVisibility('visible');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe(useTank, () => {
  describe('projection', () => {
    it('is loading until the first snapshot arrives', () => {
      const { result } = renderHook(() => useTank({ fetchSnapshot: () => new Promise(() => {}), required: 60 }));

      expect(result.current).toMatchObject({ status: 'loading', balance: undefined, error: undefined });
    });

    it('projects the balance between snapshots without fetching', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      expect(result.current).toMatchObject({ status: 'recharging', balance: 40, fraction: 0.4, msUntilReady: 20_000 });

      await advance(5000);

      expect(result.current).toMatchObject({ status: 'recharging', balance: 45, msUntilReady: 15_000 });
      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    });

    it('measures the clock offset when a snapshot arrives', async () => {
      // The server is 10 s behind the browser.
      const fetchSnapshot = vi.fn(() => Promise.resolve({ ...BASE, asOf: START - 10_000 }));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      expect(result.current).toMatchObject({ balance: 40, readyAt: START + 20_000 });
      expect(result.current.projectAt(START + 2000)).toBe(42);
    });

    it('reports an invalid required amount as an error and does not arm the ready refetch', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 101 }));
      await flush();

      expect(result.current).toMatchObject({
        status: 'error',
        error: expect.any(RangeError),
        balance: 40,
        readyAt: Infinity,
        msUntilReady: Infinity,
      });

      await advance(120_000);

      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    });

    it('keeps the RangeError of an invalid required amount over a later fetch failure', async () => {
      const fetchSnapshot = vi.fn<UseTankOptions['fetchSnapshot']>().mockResolvedValueOnce(BASE);
      fetchSnapshot.mockRejectedValueOnce(new Error('offline'));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 101 }));
      await flush();
      await act(() => result.current.refresh());

      expect(result.current.error).toBeInstanceOf(RangeError);
    });
  });

  describe('fetch triggers', () => {
    it('refetches after the projected ready time plus the random delay', async () => {
      vi.mocked(Math.random).mockReturnValue(0.5);
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      await advance(20_000 + 1499);
      expect(fetchSnapshot).toHaveBeenCalledTimes(1);

      await advance(1);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    });

    it('does not arm the ready refetch for a tank that does not refill', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve({ ...BASE, refillAmount: 0 }));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      expect(result.current).toMatchObject({ status: 'recharging', readyAt: Infinity });

      await advance(10 * 60_000);

      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    });

    it('arms the ready refetch for a ready time beyond the longest delay of one timeout', async () => {
      // The ready time is 2 ** 32 ms away, past the 2 ** 31 - 1 ms that one `setTimeout` can wait.
      const fetchSnapshot = vi.fn(() => Promise.resolve({ ...BASE, refillIntervalMs: 2 ** 31 }));
      renderHook(() => useTank({ fetchSnapshot, required: 42 }));
      await flush();
      // Hide the tab so that the once-per-second tick does not run across the long advance.
      await changeVisibility('hidden');

      await advance(2 ** 32 - 1);
      expect(fetchSnapshot).toHaveBeenCalledTimes(1);

      await advance(1);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    });

    it('refetches when the tab becomes visible, and pauses the interval while it is hidden', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve({ ...BASE, balance: 100 }));
      renderHook(() => useTank({ fetchSnapshot, required: 60, refreshIntervalMs: 10_000 }));
      await flush();

      await advance(10_000);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);

      await changeVisibility('hidden');
      await advance(30_000);
      expect(fetchSnapshot).toHaveBeenCalledTimes(2);

      await changeVisibility('visible');
      expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    });

    it('does not refetch when the required amount changes', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      const { result, rerender } = renderHook((required: number) => useTank({ fetchSnapshot, required }), {
        initialProps: 60,
      });
      await flush();
      const { revision } = result.current;

      rerender(30);

      expect(result.current).toMatchObject({ status: 'ready', revision: revision + 1 });
      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    });

    it('uses the latest fetch function without restarting the fetches', async () => {
      const first = vi.fn(() => Promise.resolve(BASE));
      const second = vi.fn(() => Promise.resolve(BASE));
      const { result, rerender } = renderHook(
        (fetchSnapshot: UseTankOptions['fetchSnapshot']) => useTank({ fetchSnapshot, required: 60 }),
        { initialProps: first },
      );
      await flush();

      rerender(second);
      await flush();
      expect(second).not.toHaveBeenCalled();

      await act(() => result.current.refresh());
      expect(second).toHaveBeenCalledTimes(1);
      expect(first).toHaveBeenCalledTimes(1);
    });
  });

  describe('abort', () => {
    it('aborts a fetch that a newer request supersedes, and resolves its refresh', async () => {
      const signals: AbortSignal[] = [];
      const fetchSnapshot = vi.fn((signal: AbortSignal) => {
        signals.push(signal);
        return new Promise<Snapshot>(() => {});
      });
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));

      let first: Promise<void> | undefined;
      await act(async () => {
        first = result.current.refresh();
        void result.current.refresh();
        await Promise.resolve();
      });

      // The mount fetch and the first refresh are superseded; the second refresh stays in flight.
      expect(signals.map((signal) => signal.aborted)).toStrictEqual([true, true, false]);
      await expect(first).resolves.toBeUndefined();
    });

    it('aborts the fetch in flight on unmount and does not fetch afterwards', async () => {
      const signals: AbortSignal[] = [];
      const fetchSnapshot = vi.fn((signal: AbortSignal) => {
        signals.push(signal);
        return Promise.resolve(BASE);
      });
      const { result, unmount } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      const { refresh, applySnapshot } = result.current;

      unmount();
      await refresh();
      applySnapshot({ ...BASE, asOf: START + 1 });
      await changeVisibility('hidden');
      await changeVisibility('visible');
      await advance(60_000);

      expect(signals).toHaveLength(1);
      expect(signals[0]?.aborted).toBe(true);
    });
  });

  describe('snapshots', () => {
    it('applies a snapshot from the site and increments the revision', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();
      const { revision } = result.current;

      act(() => result.current.applySnapshot({ ...BASE, balance: 10, asOf: START }));

      expect(result.current).toMatchObject({ balance: 10, revision: revision + 1 });
    });

    it('ignores a snapshot older than the current one', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();
      const { revision } = result.current;

      act(() => result.current.applySnapshot({ ...BASE, balance: 90, asOf: START - 1 }));

      expect(result.current).toMatchObject({ balance: 40, revision });
    });

    it('increments the revision when the tab becomes visible', async () => {
      const fetchSnapshot = vi.fn(() => new Promise<Snapshot>(() => {}));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      const { revision } = result.current;

      await changeVisibility('hidden');
      await changeVisibility('visible');

      expect(result.current.revision).toBe(revision + 1);
    });
  });

  describe('errors', () => {
    it('reports a failure before any snapshot as the error status', async () => {
      const fetchSnapshot = vi.fn(() => Promise.reject(new Error('offline')));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      expect(result.current).toMatchObject({ status: 'error', error: new Error('offline'), balance: undefined });
    });

    it('keeps projecting the last snapshot after a failure, and clears the error on the next success', async () => {
      const fetchSnapshot = vi.fn<UseTankOptions['fetchSnapshot']>().mockResolvedValueOnce(BASE);
      fetchSnapshot.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(BASE);
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      await act(() => result.current.refresh());
      expect(result.current).toMatchObject({ status: 'recharging', balance: 40, error: new Error('offline') });

      await act(() => result.current.refresh());
      expect(result.current.error).toBeUndefined();
    });

    it('wraps a non-Error rejection with the rejected value as its cause', async () => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- covers a non-Error rejection.
      const fetchSnapshot = vi.fn(() => Promise.reject('offline'));
      const { result } = renderHook(() => useTank({ fetchSnapshot, required: 60 }));
      await flush();

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.cause).toBe('offline');
    });
  });

  describe('tick', () => {
    it('stops re-rendering once the balance reaches the capacity', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(readServerSnapshot(98)));
      let renders = 0;
      renderHook(() => {
        renders += 1;
        return useTank({ fetchSnapshot, required: 100 });
      });
      await flush();
      const rendersAfterLoad = renders;

      // The balance reaches the capacity at 2 s, when the ready refetch also runs.
      await advance(3000);
      expect(renders).toBeGreaterThan(rendersAfterLoad);
      const rendersAtCapacity = renders;

      await advance(10_000);
      expect(renders).toBe(rendersAtCapacity);
    });

    it('does not re-render while the tab is hidden', async () => {
      const fetchSnapshot = vi.fn(() => Promise.resolve(BASE));
      let renders = 0;
      renderHook(() => {
        renders += 1;
        return useTank({ fetchSnapshot, required: 60 });
      });
      await flush();
      await changeVisibility('hidden');
      const rendersWhenHidden = renders;

      await advance(10_000);

      expect(renders).toBe(rendersWhenHidden);
    });
  });
  describe('result fields', () => {
    it('reports the required amount and no snapshot while loading', () => {
      const { result } = renderHook(() => useTank({ fetchSnapshot: () => new Promise(() => {}), required: 60 }));

      expect(result.current).toMatchObject({ snapshot: undefined, required: 60 });
    });

    it('reports the applied snapshot and keeps its identity across ticks', async () => {
      const { result } = renderHook(() => useTank({ fetchSnapshot: () => Promise.resolve(BASE), required: 60 }));
      await flush();
      const applied = result.current.snapshot;

      await advance(3000);

      expect(applied).toStrictEqual(BASE);
      expect(result.current.snapshot).toBe(applied);
    });

    it('replaces the snapshot only with a newer one', async () => {
      const { result } = renderHook(() => useTank({ fetchSnapshot: () => Promise.resolve(BASE), required: 60 }));
      await flush();
      const newer = { ...BASE, balance: 10, asOf: START + 1 };

      act(() => result.current.applySnapshot({ ...BASE, asOf: START - 1 }));

      expect(result.current.snapshot).toStrictEqual(BASE);

      act(() => result.current.applySnapshot(newer));

      expect(result.current.snapshot).toBe(newer);
    });

    it('reports the snapshot and the required amount in the error status', async () => {
      const { result } = renderHook(() => useTank({ fetchSnapshot: () => Promise.resolve(BASE), required: 101 }));
      await flush();

      expect(result.current).toMatchObject({ status: 'error', snapshot: BASE, required: 101 });
    });
  });
});

// region | Helpers
async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

async function changeVisibility(state: DocumentVisibilityState): Promise<void> {
  setVisibility(state);
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
  });
}

async function flush(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(0));
}

// Returns the snapshot that a server holding `balanceAtStart` at `START` answers with now.
function readServerSnapshot(balanceAtStart: number): Snapshot {
  const now = Date.now();
  return { ...BASE, balance: Math.min(BASE.capacity, balanceAtStart + (now - START) / 1000), asOf: now };
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}
// endregion | Helpers
