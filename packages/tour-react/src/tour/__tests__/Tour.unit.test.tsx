import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { stubDialog } from '../test-utils/stub-dialog.ts';
import { Tour, type TourProps } from '../Tour.tsx';
import type { TourStep } from '../types.ts';

const STEPS: readonly TourStep[] = [
  { eyebrow: 'Why', title: 'Scattered', lead: 'Notes live in five apps.' },
  { eyebrow: 'What', title: 'One inbox', lead: 'Everything lands here.' },
  { eyebrow: 'How', title: 'Sorted', lead: 'Rules file it for you.', visual: <input aria-label="Rule name" /> },
];

beforeAll(stubDialog);
afterEach(cleanup);

describe(Tour, () => {
  describe('dialog', () => {
    it('opens as a modal named by its label and closes when isOpen becomes false', () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
      const { rerender } = renderTour({ isOpen: true, label: 'Welcome' });

      expect(showModal).toHaveBeenCalledOnce();
      expect(getDialog('Welcome').open).toBe(true);

      rerender(<Tour {...buildProps({ isOpen: false, label: 'Welcome' })} />);
      expect(close).toHaveBeenCalledOnce();
      showModal.mockRestore();
      close.mockRestore();
    });

    it('keeps its name while the steps change', async () => {
      const user = userEvent.setup();
      renderTour();

      await user.click(getButton('Next'));
      expect(getDialog().getAttribute('aria-labelledby')).not.toBeNull();
      expect(getDialog()).toBe(screen.getByRole('dialog', { name: 'Product tour' }));
    });

    it('focuses the forward button on open', () => {
      renderTour();

      expect(document.activeElement).toBe(getButton('Next'));
    });

    it('renders nothing without steps', () => {
      const { container } = renderTour({ steps: [] });

      expect(container.childElementCount).toBe(0);
    });
  });

  describe('dismissal', () => {
    it('reports a close from the close button', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderTour({ onOpenChange });

      await user.click(getButton('Close'));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('reports a close on Escape and leaves the dialog open until isOpen changes', () => {
      const onOpenChange = vi.fn();
      renderTour({ onOpenChange });

      const cancel = new Event('cancel', { cancelable: true });
      fireEvent(getDialog(), cancel);
      expect(cancel.defaultPrevented).toBe(true);
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(getDialog().open).toBe(true);
    });

    it('reports a close that the browser makes on its own', () => {
      const onOpenChange = vi.fn();
      renderTour({ onOpenChange });

      getDialog().close();
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('reports a close from Finish on the last step', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderTour({ onOpenChange });

      await user.click(getButton('Step 3: Sorted'));
      await user.click(getButton('Finish'));
      expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe('navigation', () => {
    it('moves with Previous and Next, and disables Previous on the first step', async () => {
      const user = userEvent.setup();
      renderTour();

      expect(getButton('Previous')).toHaveProperty('disabled', true);
      await user.click(getButton('Next'));
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 2 of 3: One inbox');
      expect(getCurrentSlide().dataset['direction']).toBe('forward');

      await user.click(getButton('Previous'));
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 1 of 3: Scattered');
      expect(getCurrentSlide().dataset['direction']).toBe('backward');
    });

    it('keeps focus on the forward button when Next becomes Finish', async () => {
      const user = userEvent.setup();
      renderTour();

      const forward = getButton('Next');
      await user.click(forward);
      await user.click(forward);
      expect(forward.textContent).toBe('Finish');
      expect(document.activeElement).toBe(forward);
    });

    it('marks the current dot and jumps to the step of the dot that is pressed', async () => {
      const user = userEvent.setup();
      renderTour();

      expect(getButton('Step 1: Scattered').getAttribute('aria-current')).toBe('step');
      await user.click(getButton('Step 3: Sorted'));
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 3 of 3: Sorted');
      expect(getButton('Step 3: Sorted').getAttribute('aria-current')).toBe('step');
      expect(getButton('Step 1: Scattered').getAttribute('aria-current')).toBeNull();
    });

    it('moves with the arrow keys and stops at both ends', async () => {
      const user = userEvent.setup();
      renderTour();

      await user.keyboard('{ArrowLeft}');
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 1 of 3: Scattered');
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 3 of 3: Sorted');
      expect(getDialog().open).toBe(true);
    });

    it('ignores the arrow keys while focus is in an editable field', async () => {
      const user = userEvent.setup();
      renderTour();

      await user.click(getButton('Step 3: Sorted'));
      await user.click(screen.getByRole('textbox', { name: 'Rule name' }));
      await user.keyboard('{ArrowLeft}');
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 3 of 3: Sorted');
    });

    it('starts at the first step each time it opens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderTour();

      await user.click(getButton('Step 3: Sorted'));
      rerender(<Tour {...buildProps({ isOpen: false })} />);
      rerender(<Tour {...buildProps({ isOpen: true })} />);
      expect(getCurrentSlide().getAttribute('aria-label')).toBe('Step 1 of 3: Scattered');
    });
  });

  describe('action', () => {
    it('shows the call to action on the last step only', async () => {
      const user = userEvent.setup();
      renderTour({ action: <button type="button">Create a project</button> });

      expect(screen.queryByRole('button', { name: 'Create a project' })).toBeNull();
      await user.click(getButton('Step 3: Sorted'));
      expect(getButton('Create a project')).toBeDefined();
    });
  });
});

// region | Helpers

function buildProps(overrides: Partial<TourProps> = {}): TourProps {
  return { isOpen: true, onOpenChange: vi.fn(), steps: STEPS, ...overrides };
}

function getButton(name: string): HTMLButtonElement {
  const button = screen.getByRole('button', { name });
  if (!(button instanceof HTMLButtonElement)) throw new TypeError(`"${name}" is not a button element`);
  return button;
}

function getCurrentSlide(): HTMLElement {
  return screen.getByRole('group', { name: /^Step \d+ of \d+/ });
}

function getDialog(name = 'Product tour'): HTMLDialogElement {
  const dialog = screen.getByRole('dialog', { name });
  if (!(dialog instanceof HTMLDialogElement)) throw new TypeError('The dialog is not a dialog element');
  return dialog;
}

function renderTour(overrides: Partial<TourProps> = {}): ReturnType<typeof render> {
  return render(<Tour {...buildProps(overrides)} />);
}

// endregion | Helpers
