import { act, cleanup, renderHook } from '@testing-library/react';
import type { EntryDraft, JournalEntry } from '@williamthorsen/readout-journal';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useJournal } from '../useJournal.ts';

interface Events {
  added: { count: number };
}

type Action = { type: 'add' } | { type: 'noop' };

const RESTORED: readonly JournalEntry<Events>[] = [
  { id: 'entry-1', at: '2026-11-06T09:00:00.000Z', type: 'added', subjects: ['counter'], data: { count: 1 } },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe(useJournal, () => {
  it('starts from the initial state and the restored entries', () => {
    const { result } = renderHook(() => useJournal(reduce, derive, () => 1, RESTORED));

    expect(result.current.state).toBe(1);
    expect(result.current.journal).toStrictEqual(RESTORED);
  });

  it('journals a transition, numbered after the restored entries and stamped with the dispatch time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T12:00:00.000Z'));
    const { result } = renderHook(() => useJournal(reduce, derive, () => 1, RESTORED));

    act(() => result.current.dispatch({ type: 'add' }));

    expect(result.current.state).toBe(2);
    expect(result.current.journal.at(-1)).toStrictEqual({
      id: 'entry-2',
      at: '2026-11-06T12:00:00.000Z',
      type: 'added',
      subjects: ['counter'],
      data: { count: 2 },
    });
  });

  it('keeps the journal and the dispatch unchanged across a transition that derives nothing', () => {
    const { result } = renderHook(() => useJournal(reduce, derive, () => 1));
    const { dispatch, journal } = result.current;

    act(() => result.current.dispatch({ type: 'noop' }));

    expect(result.current.journal).toBe(journal);
    expect(result.current.dispatch).toBe(dispatch);
  });
});

// region | Helpers
/** Derives an `added` entry from each transition that changes the count. */
function derive(before: number, _action: Action, after: number): readonly EntryDraft<Events>[] {
  return after === before ? [] : [{ type: 'added', subjects: ['counter'], data: { count: after } }];
}

/** Adds one to the count, or leaves it as it is. */
function reduce(state: number, action: Action): number {
  return action.type === 'add' ? state + 1 : state;
}
// endregion | Helpers
