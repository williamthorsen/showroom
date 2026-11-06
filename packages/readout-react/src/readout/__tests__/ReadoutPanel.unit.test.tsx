import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { Readout } from '@williamthorsen/readout';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReadoutPanel } from '../ReadoutPanel.tsx';

afterEach(cleanup);

const TOKEN: Readout<{ id: string; secret: string }> = {
  data: { id: 'tok-1', secret: 'ATATT-1' },
  sensitive: ['secret'],
};

describe(ReadoutPanel, () => {
  it('shows and copies the JSON without sensitive fields by default', async () => {
    const onCopy = vi.fn((_text: string) => Promise.resolve(true));
    render(<ReadoutPanel readout={TOKEN} onCopy={onCopy} />);

    expect(readJson()).toStrictEqual({ id: 'tok-1', redacted: ['secret'] });
    await copy();
    expect(JSON.parse(String(onCopy.mock.calls[0]?.[0]))).toStrictEqual({ id: 'tok-1', redacted: ['secret'] });
  });

  it('includes sensitive fields in the JSON and the copy once the checkbox is on', async () => {
    const onCopy = vi.fn((_text: string) => Promise.resolve(true));
    render(<ReadoutPanel readout={TOKEN} onCopy={onCopy} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Include sensitive fields' }));

    expect(readJson()).toStrictEqual({ id: 'tok-1', secret: 'ATATT-1' });
    await copy();
    expect(JSON.parse(String(onCopy.mock.calls[0]?.[0]))).toStrictEqual({ id: 'tok-1', secret: 'ATATT-1' });
  });

  it('omits the checkbox when the readout has no sensitive field', () => {
    render(<ReadoutPanel readout={{ data: { id: 'tok-1' }, sensitive: [] }} />);

    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});

// region | Helpers
/** Clicks Copy JSON and waits for the copy to settle. */
async function copy(): Promise<void> {
  await act(async () => {
    screen.getByRole('button', { name: 'Copy JSON' }).click();
    await Promise.resolve();
  });
}

/** Parses the JSON that the panel shows. */
function readJson(): unknown {
  return JSON.parse(screen.getByRole('region', { name: 'JSON' }).textContent);
}
// endregion | Helpers
