/// <reference lib="dom" />
import { describe, expect, it } from 'vitest';

import { embedJson } from '../embed-json.ts';

describe('embedJson', () => {
  it.each(['</script><p>escaped</p>', '<!-- comment', '</SCRIPT >', 'a < b'])(
    'keeps %j inside its element and parses back to the same value',
    (text) => {
      const value = { text, nested: [text] };
      const container = document.createElement('div');

      container.innerHTML = `<script type="application/json">${embedJson(JSON.stringify(value))}</script>`;

      expect(container.children).toHaveLength(1);
      expect(JSON.parse(container.firstElementChild?.textContent ?? '')).toStrictEqual(value);
    },
  );

  it('leaves JSON without a < unchanged', () => {
    const json = JSON.stringify({ id: 'tok-1', count: 2 });

    expect(embedJson(json)).toBe(json);
  });
});
