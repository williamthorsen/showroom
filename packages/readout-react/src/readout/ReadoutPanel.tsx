import { type Readout, type ReadoutData, serializeReadout } from '@williamthorsen/readout';
import { type ReactElement, useState } from 'react';

import { CopyButton } from '#src/copy/CopyButton.tsx';
import { JsonView } from '#src/json/JsonView.tsx';

export interface ReadoutPanelProps<T extends ReadoutData> {
  readout: Readout<T>;
  /** Copies the JSON and reports whether the copy succeeded. Writes to the clipboard by default. */
  onCopy?: ((text: string) => Promise<boolean>) | undefined;
}

/**
 * A readout as JSON with Copy JSON, without its sensitive fields until the person turns on "Include sensitive fields",
 * which the panel shows only when the readout has such fields.
 */
export function ReadoutPanel<T extends ReadoutData>({ readout, onCopy }: ReadoutPanelProps<T>): ReactElement {
  const [isSensitiveIncluded, setIsSensitiveIncluded] = useState(false);
  const json = serializeReadout(readout, { includeSensitive: isSensitiveIncluded });

  return (
    <div className="readout-panel">
      <div className="readout-panel-controls">
        {readout.sensitive.length > 0 && (
          <label className="readout-checkbox">
            <input
              type="checkbox"
              checked={isSensitiveIncluded}
              onChange={(event) => setIsSensitiveIncluded(event.currentTarget.checked)}
            />
            Include sensitive fields
          </label>
        )}
        <CopyButton text={json} label="Copy JSON" onCopy={onCopy} />
      </div>
      <JsonView json={json} label="JSON" />
    </div>
  );
}
