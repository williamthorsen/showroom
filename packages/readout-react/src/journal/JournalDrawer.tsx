import { type EntryRenderers, type JournalEntry, renderEntry, serializeJournal } from '@williamthorsen/readout-journal';
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { CopyButton } from '#src/copy/CopyButton.tsx';
import { JsonView } from '#src/json/JsonView.tsx';

import { DockSeparator } from './DockSeparator.tsx';

export interface JournalDrawerProps<M> {
  isOpen: boolean;
  /** Reports that the dock opened or closed, by its toggle, its Close button, or the Escape key. */
  onOpenChange: (isOpen: boolean) => void;
  /** The journal's entries, in the order in which they were recorded. */
  entries: readonly JournalEntry<M>[];
  renderers: EntryRenderers<M, ReactNode>;
  /** The dock's heading and the toggle's text. */
  title?: string | undefined;
  /** The line shown while the journal has no entries. */
  emptyText?: string | undefined;
  /** Copies the JSON and reports whether the copy succeeded. Writes to the clipboard by default. */
  onCopy?: ((text: string) => Promise<boolean>) | undefined;
  /** The viewport edge to which the dock is fixed. */
  side?: 'bottom' | 'right' | undefined;
  /** The dock's starting size in pixels, read once at mount and clamped to the viewport. */
  defaultSize?: number | undefined;
  /**
   * Reports each size at which the dock settles: at the end of a drag, at each key step, and whenever the clamp corrects
   * the size, such as after the window shrinks.
   */
  onSizeChange?: ((size: number) => void) | undefined;
}

/** The dock's smallest size in pixels, which keeps its header and separator within reach. */
export const MIN_DOCK_SIZE_PX = 120;

/** The dock's largest share of the viewport on its axis, which keeps part of the page visible. */
export const MAX_DOCK_SHARE = 0.9;

const DEFAULT_DOCK_SIZE_PX = 320;

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/**
 * A non-modal dock fixed to a viewport edge, with a toggle at its edge, that lists a journal's entries newest first, each
 * as one line of its time and its renderer's form, or shows the journal as JSON, with Copy JSON.
 */
export function JournalDrawer<M>({
  isOpen,
  onOpenChange,
  entries,
  renderers,
  title = 'Activity',
  emptyText = 'No activity yet.',
  onCopy,
  side = 'bottom',
  defaultSize = DEFAULT_DOCK_SIZE_PX,
  onSizeChange,
}: JournalDrawerProps<M>): ReactElement {
  const dockRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const reportedSizeRef = useRef(defaultSize);
  const panelId = useId();
  const titleId = useId();
  const [isJsonShown, setIsJsonShown] = useState(false);
  const [maxSize, setMaxSize] = useState(() => readMaxSize(side));
  const [size, setSize] = useState(() => clampSize(defaultSize, readMaxSize(side)));
  const [isDragging, setIsDragging] = useState(false);
  const json = serializeJournal(entries);

  useEffect(() => {
    function updateMaxSize(): void {
      setMaxSize(readMaxSize(side));
    }
    updateMaxSize();
    window.addEventListener('resize', updateMaxSize);
    return () => window.removeEventListener('resize', updateMaxSize);
  }, [side]);

  // Report a size once it settles: after a drag ends, after a key step, or after the clamp corrects it.
  useEffect(() => {
    if (isDragging) return;
    const clamped = clampSize(size, maxSize);
    if (clamped !== size) {
      setSize(clamped);
      return;
    }
    if (size === reportedSizeRef.current) return;
    reportedSizeRef.current = size;
    onSizeChange?.(size);
  }, [isDragging, maxSize, onSizeChange, size]);

  // React's style prop does not type custom properties, so the size is set on the element directly.
  useLayoutEffect(() => {
    dockRef.current?.style.setProperty('--readout-dock-size', `${String(size)}px`);
  }, [size]);

  function close(): void {
    onOpenChange(false);
    toggleRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Escape' || !isOpen) return;
    event.preventDefault();
    close();
  }

  return (
    // The dock catches Escape from any control inside it, the toggle included.
    <div
      ref={dockRef}
      className="readout-dock"
      data-side={side}
      data-open={isOpen ? '' : undefined}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={toggleRef}
        type="button"
        className="readout-button readout-dock-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onOpenChange(!isOpen)}
      >
        {title}
      </button>
      <aside id={panelId} className="readout-dock-panel" aria-labelledby={titleId} hidden={!isOpen}>
        <DockSeparator
          size={size}
          min={MIN_DOCK_SIZE_PX}
          max={maxSize}
          orientation={side === 'bottom' ? 'horizontal' : 'vertical'}
          label={`Resize ${title}`}
          onResize={(next) => setSize(clampSize(next, maxSize))}
          onDragChange={setIsDragging}
        />
        <div className="readout-dock-header">
          <h2 id={titleId}>{title}</h2>
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
            <button type="button" className="readout-button" onClick={close}>
              Close
            </button>
          </div>
        </div>
        <div className="readout-dock-body">
          {isJsonShown ? (
            <JsonView json={json} label={`${title} JSON`} />
          ) : entries.length === 0 ? (
            <p className="readout-dock-empty">{emptyText}</p>
          ) : (
            <ol className="readout-journal-list">
              {entries.toReversed().map((entry) => (
                <li key={entry.id} className="readout-journal-entry">
                  <time className="readout-journal-time" dateTime={entry.at}>
                    {TIME_FORMAT.format(new Date(entry.at))}
                  </time>
                  <div className="readout-journal-text">{renderEntry(entry, renderers)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

// region | Helpers
/** Returns the size clamped between the dock's minimum and the maximum, rounded to whole pixels. */
function clampSize(size: number, max: number): number {
  return Math.round(Math.min(Math.max(size, MIN_DOCK_SIZE_PX), max));
}

/** Returns the dock's largest size for the layout viewport's current extent on the side's axis, scrollbars excluded. */
function readMaxSize(side: 'bottom' | 'right'): number {
  const { clientHeight, clientWidth } = document.documentElement;
  const extent = side === 'bottom' ? clientHeight : clientWidth;
  return Math.max(MIN_DOCK_SIZE_PX, Math.floor(extent * MAX_DOCK_SHARE));
}
// endregion | Helpers
