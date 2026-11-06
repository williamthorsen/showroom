import { type Readout, type ReadoutData, serializeReadout } from '@williamthorsen/readout';
import { type KeyboardEvent, type ReactElement, type ReactNode, useId, useRef, useState } from 'react';

import { EmbeddedJson } from '#src/json/EmbeddedJson.tsx';

import { ReadoutPanel } from './ReadoutPanel.tsx';

/** A tab of the structured view. */
export type ReadoutTab = 'data' | 'details';

export interface ReadoutViewProps<T extends ReadoutData> {
  readout: Readout<T>;
  /** The id of the element that embeds the readout's JSON for a driven browser. */
  embedId: string;
  /** The result as a person reads it, shown on the Details tab. */
  children: ReactNode;
  /** Copies the JSON and reports whether the copy succeeded. Writes to the clipboard by default. */
  onCopy?: ((text: string) => Promise<boolean>) | undefined;
  /** The selected tab, when the caller controls the selection. */
  selectedTab?: ReadoutTab | undefined;
  onSelectTab?: ((tab: ReadoutTab) => void) | undefined;
}

const TABS: readonly { key: ReadoutTab; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'data', label: 'Data' },
];

/**
 * A result on a Details tab beside its readout as JSON on a Data tab, with the readout's JSON, without its sensitive
 * fields, always embedded for a driven browser.
 */
export function ReadoutView<T extends ReadoutData>({
  readout,
  embedId,
  children,
  onCopy,
  selectedTab,
  onSelectTab,
}: ReadoutViewProps<T>): ReactElement {
  const baseId = useId();
  const [ownTab, setOwnTab] = useState<ReadoutTab>('details');
  const tabRefs = useRef(new Map<ReadoutTab, HTMLButtonElement>());
  const currentTab = selectedTab ?? ownTab;

  /** Selects a tab, through the caller when it controls the selection. */
  function selectTab(tab: ReadoutTab): void {
    if (selectedTab === undefined) setOwnTab(tab);
    onSelectTab?.(tab);
  }

  /** Moves the selection and focus by the arrow, Home, and End keys, wrapping at either end. */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const index = TABS.findIndex((tab) => tab.key === currentTab);
    const nextIndex = findNextIndex(event.key, index, TABS.length);
    const next = nextIndex === undefined ? undefined : TABS[nextIndex];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next.key);
    tabRefs.current.get(next.key)?.focus();
  }

  return (
    <div className="readout-tabs">
      <EmbeddedJson id={embedId} json={serializeReadout(readout)} />
      <div role="tablist" className="readout-tablist" onKeyDown={handleKeyDown}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            ref={(element) => {
              if (element === null) tabRefs.current.delete(key);
              else tabRefs.current.set(key, element);
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${key}`}
            className="readout-tab"
            aria-selected={key === currentTab}
            aria-controls={`${baseId}-panel-${key}`}
            tabIndex={key === currentTab ? 0 : -1}
            onClick={() => selectTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-details`}
        className="readout-tabpanel"
        aria-labelledby={`${baseId}-tab-details`}
        tabIndex={0}
        hidden={currentTab !== 'details'}
      >
        {children}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-data`}
        className="readout-tabpanel"
        aria-labelledby={`${baseId}-tab-data`}
        tabIndex={0}
        hidden={currentTab !== 'data'}
      >
        <ReadoutPanel readout={readout} onCopy={onCopy} />
      </div>
    </div>
  );
}

// region | Helpers
/** Returns the index of the tab that a key selects, or `undefined` for a key that does not move the selection. */
function findNextIndex(key: string, index: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'ArrowRight':
      return (index + 1) % count;
    case 'End':
      return count - 1;
    case 'Home':
      return 0;
    default:
      return undefined;
  }
}
// endregion | Helpers
