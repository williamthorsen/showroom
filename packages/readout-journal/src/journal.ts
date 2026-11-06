/**
 * Starts a journaled state, with an empty journal or with the entries of one restored from elsewhere. A transition
 * numbers its entries from the journal's length, so a restored journal continues its sequence.
 */
export function createJournal<S, M>(state: S, entries: readonly JournalEntry<M>[] = []): Journaled<S, M> {
  return { state, journal: entries };
}

/** Derives the events that a transition produced from the state before it, the action, and the state after it. */
export type DeriveEntries<S, A, M> = (before: S, action: A, after: S) => readonly EntryDraft<M>[];

/** A domain event of any type in the map from each event type to its data. */
export type EntryDraft<M> = { [K in keyof M & string]: EntryDraftOf<M, K> }[keyof M & string];

/** A domain event of one type as a derivation returns it: what changed, to which subjects, as canonical data. */
export interface EntryDraftOf<M, K extends keyof M & string> {
  type: K;
  /** The ids of the things that the event changed. */
  subjects: readonly string[];
  data: M[K];
}

/** The id that the journal gives an event, and the time at which the event happened, as ISO 8601. */
export interface EntryStamp {
  id: string;
  at: string;
}

/** A state with the journal of the events that changed it, which the state's own reducer never reads. */
export interface Journaled<S, M> {
  state: S;
  journal: readonly JournalEntry<M>[];
}

/** A recorded event of any type in the map. */
export type JournalEntry<M> = EntryDraft<M> & EntryStamp;

/** A recorded event of one type. */
export type JournalEntryOf<M, K extends keyof M & string> = EntryDraftOf<M, K> & EntryStamp;

/** Serializes the journal's entries, in the order in which they were recorded, as JSON indented by two spaces. */
export function serializeJournal(entries: readonly unknown[]): string {
  return JSON.stringify(entries, null, 2);
}

/** An action with the time at which it was dispatched, in epoch milliseconds. */
export interface StampedAction<A> {
  action: A;
  at: number;
}

/**
 * Wraps a reducer so that each transition appends the events that `derive` finds in it, numbered in order as
 * `entry-<n>` and stamped with the action's time. The reducer receives the state alone, and a transition that changes
 * nothing and derives no event returns the journaled state unchanged.
 */
export function withJournal<S, A, M>(
  reduce: (state: S, action: A) => S,
  derive: DeriveEntries<S, A, M>,
): (journaled: Journaled<S, M>, stamped: StampedAction<A>) => Journaled<S, M> {
  return (journaled, { action, at }) => {
    const before = journaled.state;
    const after = reduce(before, action);
    const drafts = derive(before, action, after);
    if (drafts.length === 0) return after === before ? journaled : { ...journaled, state: after };
    const time = new Date(at).toISOString();
    const count = journaled.journal.length;
    const entries = drafts.map((draft, index): JournalEntry<M> => ({
      ...draft,
      id: `entry-${count + index + 1}`,
      at: time,
    }));
    return { state: after, journal: [...journaled.journal, ...entries] };
  };
}
