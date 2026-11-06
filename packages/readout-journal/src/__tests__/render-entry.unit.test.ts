import { describe, expect, it } from 'vitest';

import type { JournalEntry } from '../journal.ts';
import { type EntryRenderers, renderEntry } from '../render-entry.ts';

interface TokenEvents {
  'token-created': { name: string; scopeCount: number };
  'tokens-revoked': { names: string[] };
}

const SENTENCES: EntryRenderers<TokenEvents> = {
  'token-created': (entry) => `Created token ${entry.data.name} with ${entry.data.scopeCount} scopes`,
  'tokens-revoked': (entry) => `Revoked ${entry.data.names.join(', ')}`,
};

const ENTRIES: JournalEntry<TokenEvents>[] = [
  {
    type: 'token-created',
    subjects: ['tok-1'],
    data: { name: 'ci', scopeCount: 3 },
    id: 'entry-1',
    at: '2026-11-06T12:00:00.000Z',
  },
  {
    type: 'tokens-revoked',
    subjects: ['tok-1', 'tok-2'],
    data: { names: ['ci', 'deploy'] },
    id: 'entry-2',
    at: '2026-11-06T12:01:00.000Z',
  },
];

describe('renderEntry', () => {
  it('dispatches an entry typed as the union to the renderer for its type', () => {
    expect(ENTRIES.map((entry) => renderEntry(entry, SENTENCES))).toStrictEqual([
      'Created token ci with 3 scopes',
      'Revoked ci, deploy',
    ]);
  });

  it('returns the form that the renderers return', () => {
    const subjectCounts: EntryRenderers<TokenEvents, number> = {
      'token-created': (entry) => entry.subjects.length,
      'tokens-revoked': (entry) => entry.subjects.length,
    };

    expect(ENTRIES.map((entry) => renderEntry(entry, subjectCounts))).toStrictEqual([1, 2]);
  });

  it('requires a renderer for every event type', () => {
    // @ts-expect-error -- `tokens-revoked` lacks a renderer.
    const incomplete: EntryRenderers<TokenEvents> = {
      'token-created': (entry) => entry.data.name,
    };

    expect(Object.keys(incomplete)).toStrictEqual(['token-created']);
  });
});
