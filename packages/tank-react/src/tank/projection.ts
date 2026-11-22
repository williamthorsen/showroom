import { computeReadyAt, projectBalance, type Snapshot } from '@williamthorsen/tank';

/**
 * Projects `applied` at `browserNow`: the balance, how full the tank is, and when the balance covers `required`.
 * Reports a `required` that the core rejects as an error rather than throwing.
 */
export function projectSnapshot(applied: AppliedSnapshot, required: number, browserNow: number): Projection {
  const balance = projectAppliedBalance(applied, browserNow);
  const fraction = Math.min(1, Math.max(0, balance / applied.snapshot.capacity));
  const serverNow = browserNow - applied.offsetMs;
  let serverReadyAt: number;
  try {
    serverReadyAt = computeReadyAt(toState(applied.snapshot), applied.snapshot, required, serverNow);
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      return { status: 'error', error, balance, fraction, readyAt: Infinity, msUntilReady: Infinity };
    }
    throw error;
  }
  const readyAt = serverReadyAt + applied.offsetMs;
  return {
    status: balance >= required ? 'ready' : 'recharging',
    balance,
    fraction,
    readyAt,
    msUntilReady: Math.max(0, readyAt - browserNow),
  };
}

/** Returns the unrounded balance of `applied` at a time on the browser's clock. */
export function projectAppliedBalance(applied: AppliedSnapshot, browserTime: number): number {
  return projectBalance(toState(applied.snapshot), applied.snapshot, browserTime - applied.offsetMs);
}

/** A snapshot with the offset of the browser's clock from the server's, measured when the snapshot was accepted. */
export interface AppliedSnapshot {
  snapshot: Snapshot;
  /** The browser's clock minus the server's. */
  offsetMs: number;
}

/** The projection of a snapshot at one moment; times are on the browser's clock. */
export type Projection =
  | {
      status: 'ready' | 'recharging';
      balance: number;
      fraction: number;
      readyAt: number;
      msUntilReady: number;
    }
  | {
      status: 'error';
      error: RangeError;
      balance: number;
      fraction: number;
      readyAt: number;
      msUntilReady: number;
    };

// region | Helpers
function toState(snapshot: Snapshot): { balance: number; updatedAt: number } {
  return { balance: snapshot.balance, updatedAt: snapshot.asOf };
}
// endregion | Helpers
