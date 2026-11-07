import { FitAddon } from '@xterm/addon-fit';
import { type ITheme, Terminal as Xterm } from '@xterm/xterm';
import { type ReactElement, useEffect, useRef } from 'react';

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

/**
 * A terminal that renders the bytes of a transport, sends keystrokes back on it, and fits its grid to its container,
 * reporting the grid's size on connection and after every refit. Given `url`, it connects through a WebSocket that it
 * owns. The parent sets the component's size.
 */
export function Terminal({ className, onClose, theme, transport, url }: TerminalProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Xterm | undefined>(undefined);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const terminal = new Xterm();
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();
    const observer = new ResizeObserver(() => {
      fitAddon.fit();
    });
    observer.observe(container);
    terminalRef.current = terminal;

    return () => {
      observer.disconnect();
      terminal.dispose();
      terminalRef.current = undefined;
    };
  }, []);

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
    <div ref={containerRef} className={className === undefined ? 'terminal-react' : `terminal-react ${className}`} />
  );
}

// region | Helpers
/** Converts xterm's binary string, in which each character carries one byte, to bytes. */
function encodeBinary(data: string): Uint8Array<ArrayBuffer> {
  const buffer = new Uint8Array(data.length);
  for (let index = 0; index < data.length; index++) buffer[index] = (data.codePointAt(index) ?? 0) & 255;
  return buffer;
}
// endregion | Helpers
