import { describe, expect, it } from 'vitest';

import {
  createJournal,
  type EntryDraft,
  type Journaled,
  type JournalEntry,
  serializeJournal,
  type StampedAction,
  withJournal,
} from '../journal.ts';

interface Counter {
  count: number;
  label: string;
}

type CounterAction =
  | { type: 'add'; amount: number }
  | { type: 'add-twice'; amount: number }
  | { type: 'relabel'; label: string }
  | { type: 'none' };

interface CounterEvents {
  added: { amount: number; count: number };
}

const INITIAL: Counter = { count: 0, label: 'clicks' };
const AT = Date.UTC(2026, 10, 6, 12, 0, 0);

const journaledReduce = withJournal(reduceCounter, deriveCounterEntries);

describe('withJournal', () => {
  it('reproduces the same journal from the same stamped actions', () => {
    const actions: StampedAction<CounterAction>[] = [
      { action: { type: 'add', amount: 2 }, at: AT },
      { action: { type: 'relabel', label: 'taps' }, at: AT + 1000 },
      { action: { type: 'add-twice', amount: 1 }, at: AT + 2000 },
    ];

    const first = replay(actions);
    const second = replay(actions);

    expect(second).toStrictEqual(first);
  });

  it('numbers entries in order and stamps them with the action time as ISO 8601', () => {
    const actions: StampedAction<CounterAction>[] = [
      { action: { type: 'add', amount: 2 }, at: AT },
      { action: { type: 'add', amount: 3 }, at: AT + 1000 },
    ];

    const journaled = replay(actions);

    expect(journaled.journal).toStrictEqual([
      {
        type: 'added',
        subjects: ['clicks'],
        data: { amount: 2, count: 2 },
        id: 'entry-1',
        at: '2026-11-06T12:00:00.000Z',
      },
      {
        type: 'added',
        subjects: ['clicks'],
        data: { amount: 3, count: 5 },
        id: 'entry-2',
        at: '2026-11-06T12:00:01.000Z',
      },
    ]);
    expect(journaled.state).toStrictEqual({ count: 5, label: 'clicks' });
  });

  it('records every entry that one transition derives, with the same time', () => {
    const journaled = journaledReduce(createJournal(INITIAL), { action: { type: 'add-twice', amount: 1 }, at: AT });

    expect(journaled.journal.map((entry) => [entry.id, entry.at])).toStrictEqual([
      ['entry-1', '2026-11-06T12:00:00.000Z'],
      ['entry-2', '2026-11-06T12:00:00.000Z'],
    ]);
  });

  it('continues the numbering of a restored journal', () => {
    const restored: JournalEntry<CounterEvents>[] = [
      {
        type: 'added',
        subjects: ['clicks'],
        data: { amount: 4, count: 4 },
        id: 'entry-1',
        at: '2026-11-05T09:00:00.000Z',
      },
    ];

    const journaled = journaledReduce(createJournal({ count: 4, label: 'clicks' }, restored), {
      action: { type: 'add', amount: 1 },
      at: AT,
    });

    expect(journaled.journal.map((entry) => entry.id)).toStrictEqual(['entry-1', 'entry-2']);
  });

  it('returns the journaled state unchanged when a transition changes nothing and derives nothing', () => {
    const journaled = createJournal<Counter, CounterEvents>(INITIAL);

    expect(journaledReduce(journaled, { action: { type: 'none' }, at: AT })).toBe(journaled);
  });

  it('keeps the journal when a transition changes the state without deriving an event', () => {
    const journaled = createJournal<Counter, CounterEvents>(INITIAL);

    const next = journaledReduce(journaled, { action: { type: 'relabel', label: 'taps' }, at: AT });

    expect(next.state).toStrictEqual({ count: 0, label: 'taps' });
    expect(next.journal).toBe(journaled.journal);
  });
});

describe('serializeJournal', () => {
  it('serializes the entries as JSON indented by two spaces', () => {
    const journaled = journaledReduce(createJournal(INITIAL), { action: { type: 'add', amount: 2 }, at: AT });

    const json = serializeJournal(journaled.journal);

    expect(json).toBe(JSON.stringify(journaled.journal, null, 2));
    expect(JSON.parse(json)).toStrictEqual(journaled.journal);
  });
});

// region | Helpers
/** Derives one `added` event per addition that the transition applied. */
function deriveCounterEntries(before: Counter, action: CounterAction, after: Counter): EntryDraft<CounterEvents>[] {
  if (action.type !== 'add' && action.type !== 'add-twice') return [];
  const times = action.type === 'add' ? 1 : 2;
  return Array.from({ length: times }, (_, index) => ({
    type: 'added',
    subjects: [after.label],
    data: { amount: action.amount, count: before.count + action.amount * (index + 1) },
  }));
}

/** Applies a counter action, returning the same state when nothing changes. */
function reduceCounter(state: Counter, action: CounterAction): Counter {
  switch (action.type) {
    case 'add':
      return { ...state, count: state.count + action.amount };
    case 'add-twice':
      return { ...state, count: state.count + action.amount * 2 };
    case 'relabel':
      return { ...state, label: action.label };
    case 'none':
      return state;
  }
}

/** Applies the stamped actions in order to a fresh journal over the initial counter. */
function replay(actions: readonly StampedAction<CounterAction>[]): Journaled<Counter, CounterEvents> {
  let journaled = createJournal<Counter, CounterEvents>(INITIAL);
  for (const stamped of actions) journaled = journaledReduce(journaled, stamped);
  return journaled;
}
// endregion | Helpers
