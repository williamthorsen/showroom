import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { defineConfig, type Plugin } from 'vite';
import { type RawData, WebSocketServer } from 'ws';

const ECHO_PATH = '/echo';

// The package's `#src/*` alias is declared in tsconfig `paths`, which Vite resolves only with `tsconfigPaths` on.
export default defineConfig({
  plugins: [echoSocket()],
  resolve: { tsconfigPaths: true },
});

// region | Helpers
/** Decodes a frame's payload, in any of the shapes that `ws` delivers, as UTF-8. */
function decodeRawData(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  return (Buffer.isBuffer(data) ? data : Buffer.from(data)).toString('utf8');
}

/**
 * Serves a WebSocket at `ECHO_PATH` that speaks the terminal wire protocol: It echoes binary frames, turning a carriage
 * return into a line break, and answers each resize message with a line that states the new size.
 */
function echoSocket(): Plugin {
  return {
    name: 'terminal-react-echo-socket',
    configureServer(server) {
      const socketServer = new WebSocketServer({ noServer: true });
      const encoder = new TextEncoder();

      socketServer.on('connection', (socket) => {
        socket.send(encoder.encode('echo> '));
        socket.on('message', (data, isBinary) => {
          if (isBinary) {
            socket.send(encoder.encode(decodeRawData(data).replaceAll('\r', '\r\n')));
            return;
          }
          const message = parseJson(decodeRawData(data));
          if (isResizeMessage(message)) {
            socket.send(encoder.encode(`\r\n[resize ${String(message.cols)}x${String(message.rows)}]\r\n`));
          }
        });
      });

      // Leave every other upgrade to Vite, whose hot module replacement uses its own WebSocket.
      server.httpServer?.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (request.url !== ECHO_PATH) return;
        socketServer.handleUpgrade(request, socket, head, (client) => {
          socketServer.emit('connection', client, request);
        });
      });
    },
  };
}

/** Reports whether a parsed control message is a resize message. */
function isResizeMessage(value: unknown): value is { type: 'resize'; cols: number; rows: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'resize' &&
    'cols' in value &&
    typeof value.cols === 'number' &&
    'rows' in value &&
    typeof value.rows === 'number'
  );
}

/** Parses a text frame as JSON, returning `undefined` for one that is not JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
// endregion | Helpers
