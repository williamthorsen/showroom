<!-- readme-type: library -->

# @williamthorsen/readout-journal

A journal of what a person did in an app, derived from the app's state transitions, that a person reads as sentences and a machine reads as JSON.

<!-- section:release-notes --><!-- /section:release-notes -->

```ts
import { createJournal, withJournal } from '@williamthorsen/readout-journal';

const reduce = withJournal(reducePage, derivePageEntries); // (journaled, { action, at }) => journaled
const next = reduce(createJournal(initialState), { action, at: Date.now() }); // next.state, next.journal
```

## A journaled reducer

```ts
import {
  createJournal,
  type EntryDraft,
  type EntryRenderers,
  renderEntry,
  serializeJournal,
  withJournal,
} from '@williamthorsen/readout-journal';

interface State {
  tokens: { id: string; name: string }[];
}
type Action = { type: 'create'; id: string; name: string } | { type: 'select'; id: string };

// The data of each event, keyed by the event's type.
interface Events {
  'token-created': { name: string };
}

function reduceState(state: State, action: Action): State {
  return action.type === 'create' ? { tokens: [...state.tokens, { id: action.id, name: action.name }] } : state;
}

function deriveEntries(before: State, action: Action, after: State): EntryDraft<Events>[] {
  if (action.type !== 'create' || after.tokens === before.tokens) return [];
  return [{ type: 'token-created', subjects: [action.id], data: { name: action.name } }];
}

const reduce = withJournal(reduceState, deriveEntries);
const journaled = reduce(createJournal<State, Events>({ tokens: [] }), {
  action: { type: 'create', id: 'tok-1', name: 'ci' },
  at: Date.UTC(2026, 10, 6, 12),
});

const sentences: EntryRenderers<Events> = {
  'token-created': (entry) => `Created token ${entry.data.name}`,
};
journaled.journal.map((entry) => renderEntry(entry, sentences)); // ['Created token ci']
serializeJournal(journaled.journal); // [{ "type": "token-created", "subjects": ["tok-1"], "data": { "name": "ci" }, "id": "entry-1", "at": "2026-11-06T12:00:00.000Z" }], indented
```

In React, pass the wrapped reducer to `useReducer`, with `createJournal(initialState)` as the initial value, and dispatch `{ action, at: Date.now() }`.

## Why

After several operations, a person loses track of what they did on a page, and an agent or a test that drives the page has nothing to read except the page's text. A journal kept by hand, with a `log(...)` call beside each action, becomes a second source of truth: A call site that forgets to log, or logs before the action fails, leaves the journal disagreeing with the state.

`readout-journal` derives the journal instead. A derivation reads each transition as (state before, action, state after) and returns the domain events that it finds, such as a token created or a preset deleted, so the journal records only what actually changed. Draft edits, navigation, and opened dialogs change nothing worth recording, and the derivation returns nothing for them.

Each entry is a result in the sense of [`@williamthorsen/readout`](../readout/README.md): one object in canonical values, with a sentence renderer for each type of entry and the JSON serialization as the machine form.

## Contract

- **Derived, not read.** `withJournal` passes the reducer the state alone, so the state never depends on the journal. A transition that changes nothing and derives nothing returns the same journaled object.
- **Reproducible.** An entry's `id` is `entry-<n>`, numbered by its position in the journal, and its `at` is the dispatched action's time as ISO 8601. The same stamped actions applied to the same initial state produce the same journal.
- **Restoring.** `createJournal(state, entries)` starts from a journal recorded earlier. Later entries continue its numbering, so restore the state that the journal describes along with it.
- **Secrets.** The journal does not redact anything. The derivation keeps a secret out of an entry, for example by recording a token's tail rather than the token.
- **Renderers.** `EntryRenderers<M, R>` is readout's `Renderers` over the entries of each type in `M`, so the typecheck reports a type that lacks a renderer; `renderEntry` dispatches an entry to the renderer for its `type`. See readout's [contract](../readout/README.md#contract).
