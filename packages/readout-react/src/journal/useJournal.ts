import { createJournal, type DeriveEntries, type JournalEntry, withJournal } from '@williamthorsen/readout-journal';
import { useCallback, useMemo, useReducer } from 'react';

/** A state, the journal of the events that changed it, and a dispatch that stamps each action's time. */
export interface UseJournalResult<S, A, M> {
  state: S;
  journal: readonly JournalEntry<M>[];
  dispatch: (action: A) => void;
}

/**
 * Holds a state under a reducer and journals each transition through `derive`, starting from `init()` and from the
 * entries of a journal restored from elsewhere, if any.
 */
export function useJournal<S, A, M>(
  reduce: (state: S, action: A) => S,
  derive: DeriveEntries<S, A, M>,
  init: () => S,
  entries: readonly JournalEntry<M>[] = [],
): UseJournalResult<S, A, M> {
  const reducer = useMemo(() => withJournal(reduce, derive), [reduce, derive]);
  const [journaled, dispatchStamped] = useReducer(reducer, undefined, () => createJournal(init(), entries));
  const dispatch = useCallback((action: A) => dispatchStamped({ action, at: Date.now() }), []);
  return { state: journaled.state, journal: journaled.journal, dispatch };
}
