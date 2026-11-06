import type { ReactElement } from 'react';

export interface JsonViewProps {
  json: string;
  /** The region's accessible name. */
  label: string;
}

/** JSON in a monospace, scrollable region that takes focus, so that a keyboard user can scroll it. */
export function JsonView({ json, label }: JsonViewProps): ReactElement {
  return (
    <pre className="readout-json" tabIndex={0} role="region" aria-label={label}>
      {json}
    </pre>
  );
}
