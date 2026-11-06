import { describe, expect, it } from 'vitest';

import { render, type Renderers } from '../renderers.ts';

interface Events {
  created: { type: 'created'; id: string };
  revoked: { type: 'revoked'; id: string; count: number };
}

const SENTENCES: Renderers<Events> = {
  created: (event) => `Created ${event.id}`,
  revoked: (event) => `Revoked ${event.id} and ${event.count - 1} others`,
};

describe('render', () => {
  it('dispatches a value typed as the union to the renderer for its type', () => {
    const events: Events[keyof Events][] = [
      { type: 'created', id: 'tok-1' },
      { type: 'revoked', id: 'tok-2', count: 3 },
    ];

    expect(events.map((event) => render(event, SENTENCES))).toStrictEqual([
      'Created tok-1',
      'Revoked tok-2 and 2 others',
    ]);
  });

  it('returns the form that the renderers return', () => {
    const lengths: Renderers<Events, number> = {
      created: (event) => event.id.length,
      revoked: (event) => event.count,
    };

    expect(render({ type: 'revoked', id: 'tok-2', count: 3 }, lengths)).toBe(3);
  });

  it('rejects a registry without a renderer for every type', () => {
    // @ts-expect-error -- `revoked` lacks a renderer.
    const partial: Renderers<Events> = { created: (event) => event.id };

    expect(Object.keys(partial)).toStrictEqual(['created']);
  });
});
