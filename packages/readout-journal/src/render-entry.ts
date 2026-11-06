import { render, type Renderers } from '@williamthorsen/readout';

import type { JournalEntryOf } from './journal.ts';

/** A map from each event type to the recorded entry of that type. */
export type EntriesByType<M> = { [K in keyof M & string]: JournalEntryOf<M, K> };

/** One renderer per event type, so that the typecheck reports a type without one; each returns the form `R`. */
export type EntryRenderers<M, R = string> = Renderers<EntriesByType<M>, R>;

/** Renders an entry through the renderer for its type. */
export function renderEntry<M, K extends keyof M & string, R>(
  entry: JournalEntryOf<M, K>,
  renderers: EntryRenderers<M, R>,
): R {
  return render<EntriesByType<M>, K, R>(entry, renderers);
}
