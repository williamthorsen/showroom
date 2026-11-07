import type { Readout } from '@williamthorsen/readout';
import { type EntryDraft, type EntryRenderers, serializeJournal } from '@williamthorsen/readout-journal';
import { type ReactElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { EmbeddedJson, JournalDrawer, ReadoutView, useJournal } from '../src/index.ts';

import '../styles.css';

interface Token {
  type: 'created';
  id: string;
  name: string;
  expiresAt: string;
  secret: string;
}

interface Events {
  'token-created': { name: string };
}

interface Action {
  type: 'create';
}

const TOKEN: Readout<Token> = {
  data: { type: 'created', id: 'tok-1', name: 'ci', expiresAt: '2026-11-12T00:00:00Z', secret: 'ATATT-example' },
  sensitive: ['secret'],
};

const RENDERERS: EntryRenderers<Events> = {
  'token-created': ({ data }) => `Created token ${data.name}`,
};

const root = document.querySelector('#root');
if (root === null) throw new Error('The playground page lacks #root.');
createRoot(root).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);

/** The page that renders every component of the package over sample data. */
function Playground(): ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { state, journal, dispatch } = useJournal(countTokens, deriveEntries, () => 0);

  return (
    <main>
      <h1>readout-react playground</h1>
      <ReadoutView readout={TOKEN} embedId="token-data">
        <p>
          Token {TOKEN.data.name} expires on {TOKEN.data.expiresAt.slice(0, 10)}.
        </p>
      </ReadoutView>
      <div className="actions">
        <button type="button" className="readout-button" onClick={() => dispatch({ type: 'create' })}>
          Create token
        </button>
        <button type="button" className="readout-button" onClick={() => setIsDrawerOpen(true)}>
          Open activity
        </button>
        <button type="button" className="readout-button" disabled>
          Disabled
        </button>
      </div>
      <EmbeddedJson id="page-journal" json={serializeJournal(journal)} />
      <JournalDrawer isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen} entries={journal} renderers={RENDERERS} />
      <p>Tokens created: {state}</p>
    </main>
  );
}

// region | Helpers
/** Counts the tokens that the page created. */
function countTokens(count: number, _action: Action): number {
  return count + 1;
}

/** Derives a `token-created` entry from each creation. */
function deriveEntries(_before: number, _action: Action, after: number): readonly EntryDraft<Events>[] {
  return [{ type: 'token-created', subjects: [`tok-${String(after)}`], data: { name: `token-${String(after)}` } }];
}
// endregion | Helpers
