import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { JsonView } from '../JsonView.tsx';

afterEach(cleanup);

describe(JsonView, () => {
  it('shows the JSON in a focusable region named by its label', () => {
    render(<JsonView json='{"id": "tok-1"}' label="JSON" />);

    const region = screen.getByRole('region', { name: 'JSON' });
    expect(region.textContent).toBe('{"id": "tok-1"}');
    expect(region.tabIndex).toBe(0);
  });
});
