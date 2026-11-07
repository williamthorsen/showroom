import type { TerminalSize, TerminalTransport } from './terminal-transport.ts';

export interface WebSocketTransportOptions {
  /** Receives the socket's close event when the socket closes for any reason other than a call to `close`. */
  onClose?: ((event: CloseEvent) => void) | undefined;
}

/** A terminal transport over a WebSocket that the transport owns. */
export interface WebSocketTransport extends TerminalTransport {
  /** Closes the socket without calling `onClose`. */
  close(): void;
}

/** The control message that reports the terminal's size, sent as a JSON text frame. */
export interface ResizeMessage {
  type: 'resize';
  cols: number;
  rows: number;
}

/**
 * Opens a WebSocket at `url` and carries terminal bytes over it as binary frames. The transport sends the latest size
 * as a `ResizeMessage` text frame when the socket opens and on each later resize, holds bytes sent before the socket
 * opens until it does, and ignores text frames from the server.
 */
export function createWebSocketTransport(url: string, options: WebSocketTransportOptions = {}): WebSocketTransport {
  const socket = new WebSocket(url);
  socket.binaryType = 'arraybuffer';

  const listeners = new Set<(data: Uint8Array) => void>();
  const pending: Uint8Array<ArrayBuffer>[] = [];
  let size: TerminalSize | undefined;
  let isClosedByCaller = false;

  socket.addEventListener('open', () => {
    for (const data of pending) socket.send(data);
    pending.length = 0;
    if (size !== undefined) sendResize(socket, size);
  });

  socket.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (!(event.data instanceof ArrayBuffer)) return;
    const data = new Uint8Array(event.data);
    for (const listener of listeners) listener(data);
  });

  socket.addEventListener('close', (event) => {
    pending.length = 0;
    if (!isClosedByCaller) options.onClose?.(event);
  });

  return {
    send(data) {
      if (socket.readyState === WebSocket.CONNECTING) pending.push(data);
      else if (socket.readyState === WebSocket.OPEN) socket.send(data);
    },
    resize(nextSize) {
      size = nextSize;
      if (socket.readyState === WebSocket.OPEN) sendResize(socket, nextSize);
    },
    subscribe(onData) {
      listeners.add(onData);
      return () => {
        listeners.delete(onData);
      };
    },
    close() {
      isClosedByCaller = true;
      socket.close();
    },
  };
}

// region | Helpers
function sendResize(socket: WebSocket, { cols, rows }: TerminalSize): void {
  const message: ResizeMessage = { type: 'resize', cols, rows };
  socket.send(JSON.stringify(message));
}
// endregion | Helpers
