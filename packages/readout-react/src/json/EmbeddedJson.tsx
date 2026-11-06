import { embedJson } from '@williamthorsen/readout';
import type { ReactElement } from 'react';

export interface EmbeddedJsonProps {
  /** The element's id and test id, by which a driven browser finds the data. */
  id: string;
  json: string;
}

/** JSON that the page embeds for a driven browser to read without revealing or clicking anything. */
export function EmbeddedJson({ id, json }: EmbeddedJsonProps): ReactElement {
  return (
    <script type="application/json" id={id} data-testid={id}>
      {embedJson(json)}
    </script>
  );
}
