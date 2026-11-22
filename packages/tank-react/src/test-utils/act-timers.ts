import { act } from '@testing-library/react';
import { vi } from 'vitest';

/** Advances the fake timers by `ms` inside `act`, running the effects and promises that they release. */
export async function advance(ms: number): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

/** Runs the pending promises and zero-delay timers inside `act`. */
export async function flush(): Promise<void> {
  await act(() => vi.advanceTimersByTimeAsync(0));
}
