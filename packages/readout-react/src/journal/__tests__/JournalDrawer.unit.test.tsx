import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { EntryRenderers, JournalEntry } from '@williamthorsen/readout-journal';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { JournalDrawer, type JournalDrawerProps, MIN_DOCK_SIZE_PX } from '../JournalDrawer.tsx';
import { stubPointerCapture } from '../test-utils/stub-pointer-capture.ts';
import { restoreViewport, stubViewport } from '../test-utils/stub-viewport.ts';

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

beforeAll(stubPointerCapture);
beforeEach(() => stubViewport(1024, 768));
afterEach(() => {
  cleanup();
  restoreViewport();
});

describe(JournalDrawer, () => {
  describe('toggle', () => {
    it('exposes whether the dock is open and shows or hides the dock to match', () => {
      const { rerender } = renderDrawer({ isOpen: false });
      expect(getToggle().getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('complementary')).toBeNull();

      rerender(<JournalDrawer {...buildProps({ isOpen: true })} />);
      expect(getToggle().getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByRole('complementary', { name: 'Activity' }).id).toBe(
        getToggle().getAttribute('aria-controls'),
      );
    });

    it('asks to open the closed dock and to close the open one', async () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderDrawer({ isOpen: false, onOpenChange });

      await userEvent.click(getToggle());
      expect(onOpenChange).toHaveBeenLastCalledWith(true);

      rerender(<JournalDrawer {...buildProps({ isOpen: true, onOpenChange })} />);
      await userEvent.click(getToggle());
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe('closing', () => {
    it('reports a close by its Close button and returns focus to the toggle', async () => {
      const onOpenChange = vi.fn();
      renderDrawer({ onOpenChange });

      await userEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(document.activeElement).toBe(getToggle());
    });

    it('closes on Escape from a control in the dock and returns focus to the toggle', async () => {
      const onOpenChange = vi.fn();
      renderDrawer({ onOpenChange });

      screen.getByRole('checkbox', { name: 'Show JSON' }).focus();
      await userEvent.keyboard('{Escape}');

      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(document.activeElement).toBe(getToggle());
    });

    it('closes on Escape from the toggle, and ignores Escape while closed', async () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderDrawer({ onOpenChange });

      getToggle().focus();
      await userEvent.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);

      rerender(<JournalDrawer {...buildProps({ isOpen: false, onOpenChange })} />);
      getToggle().focus();
      await userEvent.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledTimes(1);
    });

    it('leaves the page operable while open', async () => {
      const onBehind = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <>
          <button type="button" onClick={onBehind}>
            Behind
          </button>
          <JournalDrawer {...buildProps({ onOpenChange })} />
        </>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Behind' }));

      expect(onBehind).toHaveBeenCalledTimes(1);
      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('resizing', () => {
    it('orients its separator to the side on which it docks', () => {
      const { rerender } = renderDrawer({});
      expect(getSeparator().getAttribute('aria-orientation')).toBe('horizontal');

      rerender(<JournalDrawer {...buildProps({ side: 'right' })} />);
      expect(getSeparator().getAttribute('aria-orientation')).toBe('vertical');
    });

    it('resizes by arrow keys away from its edge, by Home and End, and reports each step', async () => {
      stubViewport(1024, 1000);
      const onSizeChange = vi.fn();
      renderDrawer({ defaultSize: 300, onSizeChange });
      getSeparator().focus();

      await userEvent.keyboard('{ArrowUp}');
      expect(getSize()).toBe(316);
      await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
      expect(getSize()).toBe(252);
      await userEvent.keyboard('{Home}');
      expect(getSize()).toBe(MIN_DOCK_SIZE_PX);
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{End}');
      expect(getSize()).toBe(900);

      expect(onSizeChange.mock.calls).toStrictEqual([[316], [252], [MIN_DOCK_SIZE_PX], [900]]);
    });

    it('grows a right dock by ArrowLeft and ignores the vertical arrows', async () => {
      const onSizeChange = vi.fn();
      renderDrawer({ side: 'right', defaultSize: 300, onSizeChange });
      getSeparator().focus();

      await userEvent.keyboard('{ArrowUp}');
      await userEvent.keyboard('{ArrowLeft}');

      expect(getSize()).toBe(316);
      expect(onSizeChange).toHaveBeenCalledExactlyOnceWith(316);
    });

    it('follows a pointer drag and reports the size once the drag ends', () => {
      stubViewport(1024, 1000);
      const onSizeChange = vi.fn();
      renderDrawer({ defaultSize: 300, onSizeChange });
      const separator = getSeparator();

      fireEvent.pointerDown(separator, { button: 0, pointerId: 1, clientY: 700 });
      fireEvent.pointerMove(separator, { pointerId: 1, clientY: 600 });
      fireEvent.pointerMove(separator, { pointerId: 1, clientY: 550 });
      expect(getSize()).toBe(450);
      expect(onSizeChange).not.toHaveBeenCalled();

      fireEvent.pointerUp(separator, { pointerId: 1, clientY: 550 });
      expect(onSizeChange).toHaveBeenCalledExactlyOnceWith(450);
    });

    it('clamps an out-of-range default size and reports the clamped size', () => {
      const onSizeChange = vi.fn();
      renderDrawer({ defaultSize: 20, onSizeChange });

      expect(getSize()).toBe(MIN_DOCK_SIZE_PX);
      expect(onSizeChange).toHaveBeenCalledExactlyOnceWith(MIN_DOCK_SIZE_PX);
    });

    it('shrinks to fit when the window shrinks, and reports the new size', () => {
      stubViewport(1024, 1000);
      const onSizeChange = vi.fn();
      renderDrawer({ defaultSize: 600, onSizeChange });

      stubViewport(1024, 500);
      act(() => {
        globalThis.dispatchEvent(new Event('resize'));
      });

      expect(getSize()).toBe(450);
      expect(getSeparator().getAttribute('aria-valuemax')).toBe('450');
      expect(onSizeChange).toHaveBeenCalledExactlyOnceWith(450);
    });
  });

  describe('content', () => {
    it('lists the entries newest first, each with its time', () => {
      renderDrawer({ entries: ENTRIES });

      const items = screen.getAllByRole('listitem');
      expect(items.map((item) => item.querySelector('.readout-journal-text')?.textContent)).toStrictEqual([
        'Created token dev',
        'Created token ci',
      ]);
      const time = items[0]?.querySelector('time');
      expect(time?.dateTime).toBe('2026-11-06T10:30:00.000Z');
      expect(time?.textContent).toBe(
        new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date('2026-11-06T10:30:00.000Z')),
      );
    });

    it('names the dock and its toggle by its title and shows the empty line while the journal is empty', () => {
      renderDrawer({ title: 'History', emptyText: 'Nothing yet.' });

      expect(screen.getByRole('complementary', { name: 'History' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'History', expanded: true })).toBeDefined();
      expect(screen.getByText('Nothing yet.')).toBeDefined();
      expect(screen.queryByRole('list')).toBeNull();
    });

    it('shows the journal as JSON while Show JSON is on, and copies the JSON', async () => {
      const onCopy = vi.fn((_text: string) => Promise.resolve(true));
      renderDrawer({ entries: ENTRIES, onCopy });

      await userEvent.click(screen.getByRole('checkbox', { name: 'Show JSON' }));
      expect(JSON.parse(screen.getByRole('region', { name: 'Activity JSON' }).textContent)).toStrictEqual(ENTRIES);
      expect(screen.queryByRole('list')).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Copy JSON' }));
      expect(JSON.parse(String(onCopy.mock.calls[0]?.[0]))).toStrictEqual(ENTRIES);
    });
  });
});

// region | Helpers
/** Returns the drawer's props: open, empty, and docked to the bottom unless the overrides say otherwise. */
function buildProps(overrides: Partial<JournalDrawerProps<Events>>): JournalDrawerProps<Events> {
  return { isOpen: true, onOpenChange: vi.fn(), entries: [], renderers: RENDERERS, ...overrides };
}

/** Returns the dock's resize separator, which is reachable only while the dock is open. */
function getSeparator(): HTMLElement {
  return screen.getByRole('separator');
}

/** Returns the dock's size as its separator reports it. */
function getSize(): number {
  return Number(getSeparator().getAttribute('aria-valuenow'));
}

/** Returns the toggle, the one button that exposes whether the dock is expanded. */
function getToggle(): HTMLElement {
  const toggle = screen.getAllByRole('button').find((button) => button.hasAttribute('aria-expanded'));
  if (toggle === undefined) throw new Error('The drawer did not render a toggle.');
  return toggle;
}

/** Renders the drawer with the props that `buildProps` returns for the overrides. */
function renderDrawer(overrides: Partial<JournalDrawerProps<Events>>): ReturnType<typeof render> {
  return render(<JournalDrawer {...buildProps(overrides)} />);
}
// endregion | Helpers
