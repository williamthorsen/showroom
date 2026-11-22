import type { Snapshot } from '@williamthorsen/tank';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';

import { type AppliedSnapshot, projectAppliedBalance, projectSnapshot } from './projection.ts';

/**
 * Tracks a tank's shared balance from server snapshots and projects it locally between them. Fetches on mount, when
 * the tab becomes visible, shortly after the projected ready time, and at `refreshIntervalMs` when it is set.
 */
export function useTank(options: UseTankOptions): UseTankResult {
  const { required, refreshIntervalMs } = options;
  const [state, dispatch] = useReducer(reduceTankState, INITIAL_STATE);
  const [, tick] = useReducer(incrementTick, 0);
  const [isVisible, setIsVisible] = useState(readIsVisible);
  const [previousRequired, setPreviousRequired] = useState(required);
  const fetchSnapshotRef = useRef(options.fetchSnapshot);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const isMountedRef = useRef(false);

  if (previousRequired !== required) {
    setPreviousRequired(required);
    dispatch({ type: 'restart' });
  }

  useLayoutEffect(() => {
    fetchSnapshotRef.current = options.fetchSnapshot;
  });

  const refresh = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) {
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const aborted = new Promise<undefined>((resolve) => {
      controller.signal.addEventListener('abort', () => resolve(undefined), { once: true });
    });
    const outcome = await Promise.race([settleFetch(fetchSnapshotRef.current, controller.signal), aborted]);
    if (outcome === undefined || controller.signal.aborted) {
      return;
    }
    if (controllerRef.current === controller) {
      controllerRef.current = undefined;
    }
    dispatch(
      outcome.ok
        ? { type: 'snapshot', snapshot: outcome.snapshot, receivedAt: Date.now() }
        : { type: 'fetchFailed', error: outcome.error },
    );
  }, []);

  const applySnapshot = useCallback((snapshot: Snapshot): void => {
    if (isMountedRef.current) {
      dispatch({ type: 'snapshot', snapshot, receivedAt: Date.now() });
    }
  }, []);

  // Fetch on mount, and abort the request in flight on unmount.
  useEffect(() => {
    isMountedRef.current = true;
    void refresh();
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      controllerRef.current = undefined;
    };
  }, [refresh]);

  useEffect(() => {
    function handleVisibilityChange(): void {
      const visible = readIsVisible();
      setIsVisible(visible);
      if (!visible) {
        return;
      }

      dispatch({ type: 'restart' });
      void refresh();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  // Refetch shortly after the projected ready time; the random delay keeps open tabs from fetching at one instant.
  const { applied } = state;
  useEffect(() => {
    if (applied === undefined) {
      return;
    }
    const projection = projectSnapshot(applied, required, Date.now());
    if (projection.status !== 'recharging' || !Number.isFinite(projection.readyAt)) {
      return;
    }
    return scheduleAt(projection.readyAt + Math.random() * READY_REFETCH_JITTER_MS, () => void refresh());
  }, [applied, required, refresh]);

  useEffect(() => {
    if (refreshIntervalMs === undefined || !isVisible) {
      return;
    }
    const interval = setInterval(() => void refresh(), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [isVisible, refreshIntervalMs, refresh]);

  const now = Date.now();
  const projection = applied === undefined ? undefined : projectSnapshot(applied, required, now);
  const isRefilling =
    applied !== undefined &&
    projection !== undefined &&
    applied.snapshot.refillAmount > 0 &&
    projection.balance < applied.snapshot.capacity;
  const shouldTick = isVisible && isRefilling;

  // Re-render once per second while the balance visibly refills, so that the countdown advances.
  useEffect(() => {
    if (!shouldTick) {
      return;
    }
    const interval = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [shouldTick]);

  const projectAt = useCallback(
    (browserTime: number): number | undefined =>
      applied === undefined ? undefined : projectAppliedBalance(applied, browserTime),
    [applied],
  );

  const common = { error: state.error, revision: state.revision, projectAt, refresh, applySnapshot };
  if (projection === undefined) {
    return {
      ...common,
      status: state.error === undefined ? 'loading' : 'error',
      balance: undefined,
      fraction: undefined,
      readyAt: undefined,
      msUntilReady: undefined,
    };
  }
  return {
    ...common,
    status: projection.status,
    error: projection.status === 'error' ? projection.error : state.error,
    balance: projection.balance,
    fraction: projection.fraction,
    readyAt: projection.readyAt,
    msUntilReady: projection.msUntilReady,
  };
}

/** What `useTank` needs from the site. */
export interface UseTankOptions {
  /**
   * Fetches a snapshot that the site has validated, such as with `parseSnapshot`. The hook aborts `signal` on unmount
   * and when a newer request supersedes this one. The hook reads the latest function on each fetch, so an inline
   * function does not restart fetches or timers.
   */
  fetchSnapshot: (signal: AbortSignal) => Promise<Snapshot>;
  /** The amount that the next action reserves, as the site's endpoint reports it. */
  required: number;
  /** Fetches at this interval while the tab is visible, in addition to the other triggers. */
  refreshIntervalMs?: number;
}

/**
 * The projected state of a tank. Times are epoch milliseconds on the browser's clock, and the numeric fields are
 * `undefined` until a snapshot arrives.
 */
export interface UseTankResult {
  /**
   * `ready` when the projected balance covers `required`. `error` when `required` is invalid, or when a fetch failed
   * before any snapshot arrived.
   */
  status: 'loading' | 'ready' | 'recharging' | 'error';
  /**
   * The `RangeError` for an invalid `required`, which takes precedence; otherwise the last fetch's failure, until a
   * fetch succeeds.
   */
  error: Error | undefined;
  /** The projected balance, unrounded; negative after an overage. */
  balance: number | undefined;
  /** The balance as a fraction of the capacity, from 0 to 1. */
  fraction: number | undefined;
  /** When the balance covers `required`; `Infinity` for a tank that does not refill or an invalid `required`. */
  readyAt: number | undefined;
  msUntilReady: number | undefined;
  /**
   * Increments whenever the projection restarts: on a snapshot, on a change of `required`, and when the tab becomes
   * visible.
   */
  revision: number;
  /** Returns the projected balance at a time on the browser's clock; keeps its identity until the next snapshot. */
  projectAt: (browserTime: number) => number | undefined;
  /**
   * Fetches a snapshot now, aborting any fetch in flight. Resolves once its fetch settles or is aborted, and never
   * rejects.
   */
  refresh: () => Promise<void>;
  /** Applies a snapshot that the site obtained itself, such as from its own action. An older snapshot is ignored. */
  applySnapshot: (snapshot: Snapshot) => void;
}

// region | Helpers
type FetchOutcome = { ok: true; snapshot: Snapshot } | { ok: false; error: Error };

interface TankState {
  applied: AppliedSnapshot | undefined;
  error: Error | undefined;
  revision: number;
}

type TankAction =
  | { type: 'snapshot'; snapshot: Snapshot; receivedAt: number }
  | { type: 'fetchFailed'; error: Error }
  | { type: 'restart' };

const INITIAL_STATE: TankState = { applied: undefined, error: undefined, revision: 0 };

// `setTimeout` fires at once for a delay above this.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const READY_REFETCH_JITTER_MS = 3000;

const TICK_INTERVAL_MS = 1000;

function incrementTick(count: number): number {
  return count + 1;
}

function readIsVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function reduceTankState(state: TankState, action: TankAction): TankState {
  switch (action.type) {
    case 'snapshot': {
      // A stale snapshot still shows that the server answered, so it clears the error.
      if (state.applied !== undefined && action.snapshot.asOf < state.applied.snapshot.asOf) {
        return state.error === undefined ? state : { ...state, error: undefined };
      }
      const applied = { snapshot: action.snapshot, offsetMs: action.receivedAt - action.snapshot.asOf };
      return { applied, error: undefined, revision: state.revision + 1 };
    }
    case 'fetchFailed':
      return { ...state, error: action.error };
    case 'restart':
      return { ...state, revision: state.revision + 1 };
  }
}

/** Calls `callback` at a browser time, however far off, and returns the function that cancels it. */
function scheduleAt(time: number, callback: () => void): () => void {
  let timeout: ReturnType<typeof setTimeout>;
  function arm(): void {
    const delay = time - Date.now();
    if (delay > MAX_TIMEOUT_MS) {
      timeout = setTimeout(arm, MAX_TIMEOUT_MS);
    } else {
      timeout = setTimeout(callback, Math.max(0, delay));
    }
  }
  arm();
  return () => clearTimeout(timeout);
}

async function settleFetch(
  fetchSnapshot: (signal: AbortSignal) => Promise<Snapshot>,
  signal: AbortSignal,
): Promise<FetchOutcome> {
  try {
    return { ok: true, snapshot: await fetchSnapshot(signal) };
  } catch (error: unknown) {
    return { ok: false, error: toError(error) };
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error('fetchSnapshot rejected with a non-Error value', { cause: value });
}
// endregion | Helpers
