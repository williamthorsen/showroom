import { type EntryRenderers, type JournalEntry, renderEntry, serializeJournal } from '@williamthorsen/readout-journal';
import { type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { CopyButton } from '#src/copy/CopyButton.tsx';
import { JsonView } from '#src/json/JsonView.tsx';

export interface JournalDrawerProps<M> {
  isOpen: boolean;
  /** Reports that the drawer closed, by its Close button, the Escape key, or any other route. */
  onClose: () => void;
  /** The journal's entries, in the order in which they were recorded. */
  entries: readonly JournalEntry<M>[];
  renderers: EntryRenderers<M, ReactNode>;
  title?: string | undefined;
  /** The line shown while the journal has no entries. */
  emptyText?: string | undefined;
  /** Copies the JSON and reports whether the copy succeeded. Writes to the clipboard by default. */
  onCopy?: ((text: string) => Promise<boolean>) | undefined;
}

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/**
 * A modal drawer that lists a journal's entries newest first, each as its renderer's form with its time, or shows the
 * journal as JSON, with Copy JSON.
 */
export function JournalDrawer<M>({
  isOpen,
  onClose,
  entries,
  renderers,
  title = 'Activity',
  emptyText = 'No activity yet.',
  onCopy,
}: JournalDrawerProps<M>): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isJsonShown, setIsJsonShown] = useState(false);
  const json = serializeJournal(entries);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog ref={dialogRef} className="readout-drawer" aria-labelledby={titleId} onClose={onClose}>
      <div className="readout-drawer-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="readout-button" onClick={() => dialogRef.current?.close()}>
          Close
        </button>
      </div>
      <div className="readout-panel-controls">
        <label className="readout-checkbox">
          <input
            type="checkbox"
            checked={isJsonShown}
            onChange={(event) => setIsJsonShown(event.currentTarget.checked)}
          />
          Show JSON
        </label>
        <CopyButton text={json} label="Copy JSON" onCopy={onCopy} />
      </div>
      {isJsonShown ? (
        <JsonView json={json} label={`${title} JSON`} />
      ) : entries.length === 0 ? (
        <p className="readout-drawer-empty">{emptyText}</p>
      ) : (
        <ol className="readout-journal-list">
          {entries.toReversed().map((entry) => (
            <li key={entry.id} className="readout-journal-entry">
              <div className="readout-journal-text">{renderEntry(entry, renderers)}</div>
              <time className="readout-journal-time" dateTime={entry.at}>
                {TIME_FORMAT.format(new Date(entry.at))}
              </time>
            </li>
          ))}
        </ol>
      )}
    </dialog>
  );
}
