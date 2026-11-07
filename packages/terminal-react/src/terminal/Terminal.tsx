import { FitAddon } from '@xterm/addon-fit';
import { type ITheme, Terminal as Xterm } from '@xterm/xterm';
import { type ReactElement, useEffect, useId, useRef } from 'react';

import type { TerminalTransport } from '#src/transport/terminal-transport.ts';
import { createWebSocketTransport, type WebSocketTransport } from '#src/transport/websocket-transport.ts';

interface TerminalCommonProps {
  /** xterm's colour theme. A change applies to the open terminal. */
  theme?: ITheme | undefined;
  className?: string | undefined;
}

interface TerminalUrlProps extends TerminalCommonProps {
  /** The WebSocket URL that the component connects to. A change closes the socket and opens one at the new URL. */
  url: string;
  /** Receives the close event when the socket closes for any reason other than an unmount or a change of `url`. */
  onClose?: ((event: CloseEvent) => void) | undefined;
  transport?: never;
}

interface TerminalTransportProps extends TerminalCommonProps {
  /** The transport that the component reads from and writes to. The consumer owns its lifetime. */
  transport: TerminalTransport;
  url?: never;
  onClose?: never;
}

export type TerminalProps = TerminalTransportProps | TerminalUrlProps;

/** xterm's background when the theme does not set one, which also fills the space that the grid leaves uncovered. */
const DEFAULT_BACKGROUND = '#000000';

/** The accessible description of the terminal's input, which advises the user of the focus escape. */
const FOCUS_ESCAPE_HINT = 'Press Escape, then Tab or Shift+Tab, to move focus out of the terminal.';

/** Keys that the focus escape lets pass without cancelling it, so that Escape, Shift, Tab still escapes. */
const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift']);

/**
 * A terminal that renders the bytes of a transport, sends keystrokes back on it, and fits its grid to its container,
 * reporting the grid's size on connection and after every refit. Given `url`, it connects through a WebSocket that it
 * owns. Tab is terminal input; Escape, then Tab or Shift+Tab, moves focus out. The parent sets the component's size.
 */
export function Terminal({ className, onClose, theme, transport, url }: TerminalProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Xterm | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  const hintId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const terminal = new Xterm();
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    const focusEscape = createFocusEscape();
    terminal.attachCustomKeyEventHandler(focusEscape.handleKey);
    terminal.open(container);
    // A blur or a paste ends the key sequence, so that a later Tab is input again.
    const textareaListeners = new AbortController();
    for (const type of ['blur', 'paste']) {
      terminal.textarea?.addEventListener(type, focusEscape.disarm, { signal: textareaListeners.signal });
    }
    const hint = document.createElement('span');
    hint.id = hintId;
    hint.className = 'terminal-react__hint';
    hint.textContent = FOCUS_ESCAPE_HINT;
    container.append(hint);
    terminal.textarea?.setAttribute('aria-describedby', hintId);
    fitAddon.fit();
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(container);
    terminalRef.current = terminal;

    return () => {
      observer.disconnect();
      textareaListeners.abort();
      terminal.dispose();
      hint.remove();
      terminalRef.current = undefined;
    };
  }, [hintId]);

  useEffect(() => {
    if (terminalRef.current !== undefined) terminalRef.current.options.theme = theme ?? {};
  }, [theme]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal === undefined) return;

    let ownedTransport: WebSocketTransport | undefined;
    let activeTransport: TerminalTransport;
    if (transport === undefined) {
      ownedTransport = createWebSocketTransport(url, { onClose: (event) => onCloseRef.current?.(event) });
      activeTransport = ownedTransport;
    } else {
      activeTransport = transport;
    }

    const encoder = new TextEncoder();
    const unsubscribe = activeTransport.subscribe((data) => {
      terminal.write(data);
    });
    const disposables = [
      terminal.onData((data) => {
        activeTransport.send(encoder.encode(data));
      }),
      terminal.onBinary((data) => {
        activeTransport.send(encodeBinary(data));
      }),
      terminal.onResize(({ cols, rows }) => {
        activeTransport.resize({ cols, rows });
      }),
    ];
    activeTransport.resize({ cols: terminal.cols, rows: terminal.rows });

    return () => {
      unsubscribe();
      for (const disposable of disposables) disposable.dispose();
      ownedTransport?.close();
    };
  }, [transport, url]);

  return (
    <div
      ref={containerRef}
      className={className === undefined ? 'terminal-react' : `terminal-react ${className}`}
      style={{ backgroundColor: theme?.background ?? DEFAULT_BACKGROUND }}
    />
  );
}

// region | Helpers
/**
 * Creates the focus escape: `handleKey`, xterm's custom key handler, returns `false`, so that xterm leaves the key to
 * the browser's focus navigation, for a Tab or Shift+Tab keydown whose previous non-modifier keydown was Escape, and
 * `disarm` cancels a pending escape.
 */
function createFocusEscape(): { handleKey: (event: KeyboardEvent) => boolean; disarm: () => void } {
  let isEscapeArmed = false;
  return {
    handleKey: (event) => {
      if (event.type !== 'keydown' || MODIFIER_KEYS.has(event.key)) return true;
      const isFocusEscape = isEscapeArmed && event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey;
      isEscapeArmed = event.key === 'Escape';
      return !isFocusEscape;
    },
    disarm: () => {
      isEscapeArmed = false;
    },
  };
}

/** Converts xterm's binary string, in which each character carries one byte, to bytes. */
function encodeBinary(data: string): Uint8Array<ArrayBuffer> {
  const buffer = new Uint8Array(data.length);
  for (let index = 0; index < data.length; index++) buffer[index] = (data.codePointAt(index) ?? 0) & 255;
  return buffer;
}
// endregion | Helpers
