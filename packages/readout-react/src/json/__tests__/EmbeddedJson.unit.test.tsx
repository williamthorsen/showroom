import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EmbeddedJson } from '../EmbeddedJson.tsx';

afterEach(cleanup);

describe(EmbeddedJson, () => {
  it('embeds escaped JSON that parses back to the input', () => {
    const value = { note: '</script><!-- x -->' };
    render(<EmbeddedJson id="page-data" json={JSON.stringify(value)} />);

    const element = screen.getByTestId('page-data');
    expect(element.id).toBe('page-data');
    expect(element.getAttribute('type')).toBe('application/json');
    expect(element.textContent).not.toContain('<');
    expect(JSON.parse(element.textContent)).toStrictEqual(value);
  });
});
