import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COPY_FEEDBACK_MS, CopyButton } from '../CopyButton.tsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe(CopyButton, () => {
  it('copies the text and reports success in its label and its status region', async () => {
    const onCopy = vi.fn(() => Promise.resolve(true));
    render(<CopyButton text="payload" label="Copy JSON" onCopy={onCopy} />);

    await clickButton('Copy JSON');

    expect(onCopy).toHaveBeenCalledWith('payload');
    expect(screen.getByRole('button').textContent).toBe('Copied');
    expect(screen.getByRole('status').textContent).toBe('Copied');
    expect(screen.getByRole('button').dataset['state']).toBe('copied');
  });

  it('reports a failed copy', async () => {
    render(<CopyButton text="payload" label="Copy JSON" onCopy={() => Promise.resolve(false)} />);

    await clickButton('Copy JSON');

    expect(screen.getByRole('button').textContent).toBe('Not copied');
    expect(screen.getByRole('status').textContent).toBe('Not copied');
    expect(screen.getByRole('button').dataset['state']).toBe('failed');
  });

  it('shows its label again once the feedback time has passed', async () => {
    vi.useFakeTimers();
    render(<CopyButton text="payload" label="Copy JSON" onCopy={() => Promise.resolve(true)} />);

    await clickButton('Copy JSON');
    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MS);
    });

    expect(screen.getByRole('button').textContent).toBe('Copy JSON');
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.getByRole('button').dataset['state']).toBeUndefined();
  });

  it('writes to the clipboard when no copy handler is given', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyButton text="payload" label="Copy JSON" />);

    await clickButton('Copy JSON');

    expect(writeText).toHaveBeenCalledWith('payload');
    expect(screen.getByRole('button').textContent).toBe('Copied');
  });

  it('reports a failed copy when the clipboard rejects the write', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    render(<CopyButton text="payload" label="Copy JSON" />);

    await clickButton('Copy JSON');

    expect(screen.getByRole('button').textContent).toBe('Not copied');
  });
});

// region | Helpers
/** Clicks the button with the name and waits for the copy to settle. */
async function clickButton(name: string): Promise<void> {
  await act(async () => {
    screen.getByRole('button', { name }).click();
    await Promise.resolve();
  });
}
// endregion | Helpers
