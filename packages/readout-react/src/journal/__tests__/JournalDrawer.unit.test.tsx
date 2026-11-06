import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { EntryRenderers, JournalEntry } from '@williamthorsen/readout-journal';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { JournalDrawer } from '../JournalDrawer.tsx';
import { stubDialog } from '../test-utils/stub-dialog.ts';

interface Events {
  'token-created': { name: string };
}

const RENDERERS: EntryRenderers<Events> = {
  'token-created': ({ data }) => `Created token ${data.name}`,
};

const ENTRIES: readonly JournalEntry<Events>[] = [
  { id: 'entry-1', at: '2026-11-06T09:00:00.000Z', type: 'token-created', subjects: ['tok-1'], data: { name: 'ci' } },
  { id: 'entry-2', at: '2026-11-06T10:30:00.000Z', type: 'token-created', subjects: ['tok-2'], data: { name: 'dev' } },
];

beforeAll(stubDialog);
afterEach(cleanup);

describe(JournalDrawer, () => {
  it('opens and closes the dialog as `isOpen` changes', () => {
    const { rerender } = render(<JournalDrawer isOpen={false} onClose={vi.fn()} entries={[]} renderers={RENDERERS} />);
    const dialog = getDialog();
    expect(dialog.open).toBe(false);

    rerender(<JournalDrawer isOpen onClose={vi.fn()} entries={[]} renderers={RENDERERS} />);
    expect(dialog.open).toBe(true);

    rerender(<JournalDrawer isOpen={false} onClose={vi.fn()} entries={[]} renderers={RENDERERS} />);
    expect(dialog.open).toBe(false);
  });

  it('reports a close by its Close button and by the dialog closing on its own', async () => {
    const onClose = vi.fn();
    render(<JournalDrawer isOpen onClose={onClose} entries={[]} renderers={RENDERERS} />);

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Escape closes a modal dialog in a browser, which jsdom does not emulate; the dialog's own close stands in for it.
    getDialog().showModal();
    act(() => getDialog().close());
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('lists the entries newest first, each with its time', () => {
    render(<JournalDrawer isOpen onClose={vi.fn()} entries={ENTRIES} renderers={RENDERERS} />);

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('p')?.textContent)).toStrictEqual([
      'Created token dev',
      'Created token ci',
    ]);
    const time = items[0]?.querySelector('time');
    expect(time?.dateTime).toBe('2026-11-06T10:30:00.000Z');
    expect(time?.textContent).toBe(
      new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date('2026-11-06T10:30:00.000Z')),
    );
  });

  it('names the drawer by its title and shows the empty line while the journal is empty', () => {
    render(
      <JournalDrawer
        isOpen
        onClose={vi.fn()}
        entries={[]}
        renderers={RENDERERS}
        title="History"
        emptyText="Nothing yet."
      />,
    );

    expect(screen.getByRole('dialog', { name: 'History' })).toBeDefined();
    expect(screen.getByText('Nothing yet.')).toBeDefined();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows the journal as JSON while Show JSON is on, and copies the JSON', async () => {
    const onCopy = vi.fn((_text: string) => Promise.resolve(true));
    render(<JournalDrawer isOpen onClose={vi.fn()} entries={ENTRIES} renderers={RENDERERS} onCopy={onCopy} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show JSON' }));
    expect(JSON.parse(screen.getByRole('region', { name: 'Activity JSON' }).textContent)).toStrictEqual(ENTRIES);
    expect(screen.queryByRole('list')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
    expect(JSON.parse(String(onCopy.mock.calls[0]?.[0]))).toStrictEqual(ENTRIES);
  });
});

// region | Helpers
/** Returns the drawer's dialog element, which the accessibility tree omits while it is closed. */
function getDialog(): HTMLDialogElement {
  const dialog = document.querySelector('dialog');
  if (dialog === null) throw new Error('The drawer did not render a dialog.');
  return dialog;
}
// endregion | Helpers
