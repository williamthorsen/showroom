import { type ReactElement, type Ref, useEffect, useState } from 'react';

import { copyText } from './copy-text.ts';

export interface CopyButtonProps {
  text: string;
  label: string;
  /** Copies the text and reports whether the copy succeeded. Writes to the clipboard by default. */
  onCopy?: ((text: string) => Promise<boolean>) | undefined;
  ref?: Ref<HTMLButtonElement> | undefined;
}

type CopyState = 'copied' | 'failed' | 'idle';

/** How long the button reports the result of a copy before it shows its label again. */
export const COPY_FEEDBACK_MS = 2000;

const RESULT_TEXT: Record<Exclude<CopyState, 'idle'>, string> = {
  copied: 'Copied',
  failed: 'Not copied',
};

/**
 * A button that copies a text and reports the result by its own label for a moment, and announces the result through a
 * status region.
 */
export function CopyButton({ text, label, onCopy = copyText, ref }: CopyButtonProps): ReactElement {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const resultText = copyState === 'idle' ? '' : RESULT_TEXT[copyState];

  useEffect(() => {
    if (copyState === 'idle') return;
    const timeout = setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [copyState]);

  async function handleCopy(): Promise<void> {
    setCopyState((await onCopy(text)) ? 'copied' : 'failed');
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="readout-button"
        data-state={copyState === 'idle' ? undefined : copyState}
        onClick={() => void handleCopy()}
      >
        {copyState === 'idle' ? label : resultText}
      </button>
      {/* A screen reader does not reliably announce a change to the label of the focused button. */}
      <span role="status" className="readout-visually-hidden">
        {resultText}
      </span>
    </>
  );
}
