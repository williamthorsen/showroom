import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeWebSocket } from '#src/test-utils/FakeWebSocket.ts';

import { createWebSocketTransport } from '../websocket-transport.ts';

beforeEach(() => {
  FakeWebSocket.instances.length = 0;
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe(createWebSocketTransport, () => {
  it('opens a socket at the URL that receives binary frames as array buffers', () => {
    createWebSocketTransport('ws://localhost/pty?token=abc');

    const socket = FakeWebSocket.latest();
    expect(socket.url).toBe('ws://localhost/pty?token=abc');
    expect(socket.binaryType).toBe('arraybuffer');
  });

  it('holds bytes sent before the socket opens and sends them once it does', () => {
    const transport = createWebSocketTransport('ws://localhost/pty');
    const socket = FakeWebSocket.latest();

    transport.send(bytes('ls'));
    expect(socket.sent).toStrictEqual([]);

    socket.accept();
    transport.send(bytes('\r'));

    expect(socket.sent).toStrictEqual([bytes('ls'), bytes('\r')]);
  });

  it('sends the latest size when the socket opens, and each later size at once', () => {
    const transport = createWebSocketTransport('ws://localhost/pty');
    const socket = FakeWebSocket.latest();

    transport.resize({ cols: 80, rows: 24 });
    transport.resize({ cols: 100, rows: 30 });
    socket.accept();
    transport.resize({ cols: 120, rows: 40 });

    expect(socket.sent.map(parseText)).toStrictEqual([
      { type: 'resize', cols: 100, rows: 30 },
      { type: 'resize', cols: 120, rows: 40 },
    ]);
  });

  it('delivers binary frames to subscribers until they unsubscribe', () => {
    const transport = createWebSocketTransport('ws://localhost/pty');
    const socket = FakeWebSocket.latest();
    const onData = vi.fn<(data: Uint8Array) => void>();
    socket.accept();

    const unsubscribe = transport.subscribe(onData);
    socket.receiveBinary('hello');
    unsubscribe();
    socket.receiveBinary('ignored');

    expect(onData.mock.calls.map(([data]: [Uint8Array]) => new TextDecoder().decode(data))).toStrictEqual(['hello']);
  });

  it('ignores text frames from the server', () => {
    const transport = createWebSocketTransport('ws://localhost/pty');
    const socket = FakeWebSocket.latest();
    const onData = vi.fn();
    socket.accept();
    transport.subscribe(onData);

    socket.receiveText('{"type":"exit"}');

    expect(onData).not.toHaveBeenCalled();
  });

  it('reports a close that the server starts, with its code and reason', () => {
    const onClose = vi.fn();
    createWebSocketTransport('ws://localhost/pty', { onClose });
    const socket = FakeWebSocket.latest();
    socket.accept();

    socket.closeFromServer(4000, 'session ended');

    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0]?.[0]).toMatchObject({ code: 4000, reason: 'session ended' });
  });

  it('closes the socket on `close` without reporting it, and drops later sends', () => {
    const onClose = vi.fn();
    const transport = createWebSocketTransport('ws://localhost/pty', { onClose });
    const socket = FakeWebSocket.latest();
    socket.accept();

    transport.close();
    transport.send(bytes('late'));

    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    expect(socket.sent).toStrictEqual([]);
    expect(onClose).not.toHaveBeenCalled();
  });
});

// region | Helpers
function bytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function parseText(frame: string | Uint8Array): unknown {
  if (typeof frame !== 'string') throw new TypeError('Expected a text frame.');
  return JSON.parse(frame);
}
// endregion | Helpers
