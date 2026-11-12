import { useState } from 'react';

export interface UseFirstRunTourResult {
  isOpen: boolean;
  /** Opens the tour again, such as from a menu, without changing whether it has been seen. */
  open: () => void;
  /** Passes to `Tour`; a close marks the tour seen. */
  onOpenChange: (isOpen: boolean) => void;
}

const SEEN_VALUE = '1';

/**
 * Opens a tour on the first visit for a storage key and marks it seen in `localStorage` when it closes. Storage that
 * cannot be read counts as seen, so that the tour does not reopen on every load.
 */
export function useFirstRunTour(storageKey: string): UseFirstRunTourResult {
  const [isOpen, setIsOpen] = useState(() => !readIsSeen(storageKey));

  function open(): void {
    setIsOpen(true);
  }

  function onOpenChange(nextIsOpen: boolean): void {
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) markSeen(storageKey);
  }

  return { isOpen, open, onOpenChange };
}

// region | Helpers

/** Writes the seen marker, ignoring storage that refuses the write. */
function markSeen(storageKey: string): void {
  try {
    globalThis.localStorage.setItem(storageKey, SEEN_VALUE);
  } catch {
    // The tour stays unseen and opens again on the next load.
  }
}

/** Reports whether the tour has been seen, treating unreadable storage as seen. */
function readIsSeen(storageKey: string): boolean {
  try {
    return globalThis.localStorage.getItem(storageKey) !== null;
  } catch {
    return true;
  }
}

// endregion | Helpers
