import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { Readout } from '@williamthorsen/readout';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReadoutView } from '../ReadoutView.tsx';

afterEach(cleanup);

const TOKEN: Readout<{ id: string; secret: string }> = {
  data: { id: 'tok-1', secret: 'ATATT-1' },
  sensitive: ['secret'],
};

describe(ReadoutView, () => {
  it('shows the Details tab first and embeds the JSON without sensitive fields', () => {
    render(
      <ReadoutView readout={TOKEN} embedId="token-data">
        <p>Token created</p>
      </ReadoutView>,
    );

    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Details' }).textContent).toBe('Token created');
    expect(readEmbedded()).toStrictEqual({ id: 'tok-1', redacted: ['secret'] });
  });

  it('keeps the embedding redacted when the panel includes sensitive fields', async () => {
    render(
      <ReadoutView readout={TOKEN} embedId="token-data">
        <p>Token created</p>
      </ReadoutView>,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Data' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Include sensitive fields' }));

    expect(JSON.parse(screen.getByRole('region', { name: 'JSON' }).textContent)).toHaveProperty('secret');
    expect(readEmbedded()).toStrictEqual({ id: 'tok-1', redacted: ['secret'] });
  });

  it('moves the selection and focus with the arrow, Home, and End keys, wrapping at either end', async () => {
    render(
      <ReadoutView readout={TOKEN} embedId="token-data">
        <p>Token created</p>
      </ReadoutView>,
    );
    const details = screen.getByRole('tab', { name: 'Details' });
    const data = screen.getByRole('tab', { name: 'Data' });

    await userEvent.tab();
    expect(document.activeElement).toBe(details);
    expect(data.tabIndex).toBe(-1);

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(data);
    expect(data.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Data' }).hidden).toBe(false);

    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(details);

    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(data);

    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(details);

    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(data);
  });

  it('follows the selected tab and reports selections when the caller controls them', async () => {
    const onSelectTab = vi.fn();
    const { rerender } = render(
      <ReadoutView readout={TOKEN} embedId="token-data" selectedTab="data" onSelectTab={onSelectTab}>
        <p>Token created</p>
      </ReadoutView>,
    );

    expect(screen.getByRole('tab', { name: 'Data' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.click(screen.getByRole('tab', { name: 'Details' }));
    expect(onSelectTab).toHaveBeenCalledWith('details');
    expect(screen.getByRole('tab', { name: 'Data' }).getAttribute('aria-selected')).toBe('true');

    rerender(
      <ReadoutView readout={TOKEN} embedId="token-data" selectedTab="details" onSelectTab={onSelectTab}>
        <p>Token created</p>
      </ReadoutView>,
    );
    expect(screen.getByRole('tab', { name: 'Details' }).getAttribute('aria-selected')).toBe('true');
  });
});

// region | Helpers
/** Parses the JSON that the view embeds. */
function readEmbedded(): unknown {
  return JSON.parse(screen.getByTestId('token-data').textContent);
}
// endregion | Helpers
