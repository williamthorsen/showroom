import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeWebSocket } from '#src/test-utils/FakeWebSocket.ts';
import type { TerminalSize, TerminalTransport } from '#src/transport/terminal-transport.ts';

import { Terminal } from '../Terminal.tsx';
import { FakeResizeObserver } from '../test-utils/FakeResizeObserver.ts';
import { FakeXterm } from '../test-utils/FakeXterm.ts';

vi.mock('@xterm/xterm', async () => {
  const { FakeXterm: Fake } = await import('../test-utils/FakeXterm.ts');
  return { Terminal: Fake };
});

vi.mock('@xterm/addon-fit', async () => {
  const { FakeFitAddon } = await import('../test-utils/FakeXterm.ts');
  return { FitAddon: FakeFitAddon };
});

beforeEach(() => {
  FakeXterm.instances.length = 0;
  FakeResizeObserver.instances.length = 0;
  FakeWebSocket.instances.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe(Terminal, () => {
  it('opens the terminal in its container', () => {
    const { container } = render(<Terminal transport={createFakeTransport().transport} className="shell" />);

    const element = container.firstElementChild;
    expect(element?.className).toBe('terminal-react shell');
    expect(FakeXterm.latest().element).toBe(element);
  });

  it('writes bytes from the transport to the terminal', () => {
    const fake = createFakeTransport();
    render(<Terminal transport={fake.transport} />);

    fake.deliver(new Uint8Array([104, 105]));

    expect(FakeXterm.latest().written).toStrictEqual([new Uint8Array([104, 105])]);
  });

  it('sends typed input as UTF-8 bytes and binary input as one byte per character', () => {
    const fake = createFakeTransport();
    render(<Terminal transport={fake.transport} />);

    FakeXterm.latest().emitData('é');
    FakeXterm.latest().emitBinary('\u{80}ÿ');

    expect(fake.sent.map((data) => [...data])).toStrictEqual([
      [0xc3, 0xa9],
      [0x80, 0xff],
    ]);
  });

  it('reports the size on connection and again after a container resize refits the grid', () => {
    const fake = createFakeTransport();
    render(<Terminal transport={fake.transport} />);

    FakeXterm.latest().proposedSize = { cols: 120, rows: 40 };
    act(() => {
      FakeResizeObserver.instances[0]?.trigger();
    });

    expect(fake.sizes).toStrictEqual([
      { cols: 80, rows: 24 },
      { cols: 120, rows: 40 },
    ]);
  });

  it('applies a new theme to the open terminal and to its container', () => {
    const transport = createFakeTransport().transport;
    const { container, rerender } = render(<Terminal transport={transport} theme={{ background: '#000000' }} />);

    rerender(<Terminal transport={transport} theme={{ background: '#ffffff' }} />);

    expect(FakeXterm.instances).toHaveLength(1);
    expect(FakeXterm.latest().options.theme).toStrictEqual({ background: '#ffffff' });
    expect(container.firstElementChild).toHaveProperty('style.backgroundColor', 'rgb(255, 255, 255)');
  });

  it('disposes the terminal, stops observing, and unsubscribes on unmount', () => {
    const fake = createFakeTransport();
    const { unmount } = render(<Terminal transport={fake.transport} />);

    unmount();

    expect(FakeXterm.latest().isDisposed).toBe(true);
    expect(FakeResizeObserver.instances[0]?.observed.size).toBe(0);
    expect(fake.subscriberCount()).toBe(0);
  });

  describe('focus escape', () => {
    it('keeps Tab and Shift+Tab as terminal input outside the escape', () => {
      render(<Terminal transport={createFakeTransport().transport} />);
      const terminal = FakeXterm.latest();

      expect([terminal.pressKey('Tab'), terminal.pressKey('Tab', { shiftKey: true })]).toStrictEqual([true, true]);
    });

    it('passes Escape to the terminal and leaves the next Tab or Shift+Tab to the browser', () => {
      render(<Terminal transport={createFakeTransport().transport} />);
      const terminal = FakeXterm.latest();

      expect([
        terminal.pressKey('Escape'),
        terminal.pressKey('Tab'),
        terminal.pressKey('Tab'),
        terminal.pressKey('Escape'),
        terminal.pressKey('Shift', { shiftKey: true }),
        terminal.pressKey('Tab', { shiftKey: true }),
      ]).toStrictEqual([true, false, true, true, true, false]);
    });

    it('cancels the escape on any other key', () => {
      render(<Terminal transport={createFakeTransport().transport} />);
      const terminal = FakeXterm.latest();

      terminal.pressKey('Escape');
      terminal.pressKey('a');

      expect(terminal.pressKey('Tab')).toBe(true);
    });

    it.each(['blur', 'paste'])('cancels the escape on a %s of the input', (type) => {
      render(<Terminal transport={createFakeTransport().transport} />);
      const terminal = FakeXterm.latest();

      terminal.pressKey('Escape');
      terminal.textarea?.dispatchEvent(new Event(type));

      expect(terminal.pressKey('Tab')).toBe(true);
    });

    it('ignores key events other than keydown and Tab with Ctrl, Alt, or Meta', () => {
      render(<Terminal transport={createFakeTransport().transport} />);
      const terminal = FakeXterm.latest();

      terminal.pressKey('Escape');

      expect([terminal.pressKey('Tab', { type: 'keyup' }), terminal.pressKey('Tab', { ctrlKey: true })]).toStrictEqual([
        true,
        true,
      ]);
    });

    it('describes the escape to assistive technology and removes the description on unmount', () => {
      const { container, unmount } = render(<Terminal transport={createFakeTransport().transport} />);

      const description = container.querySelector('.terminal-react__hint');
      expect(FakeXterm.latest().textarea?.getAttribute('aria-describedby')).toBe(description?.id);
      expect(description?.textContent).toBe('Press Escape, then Tab or Shift+Tab, to move focus out of the terminal.');

      unmount();

      expect(description?.isConnected).toBe(false);
    });
  });

  describe('given a URL', () => {
    it('connects to it and sends the size once the socket opens', () => {
      render(<Terminal url="ws://localhost/pty" />);

      const socket = FakeWebSocket.latest();
      expect(socket.url).toBe('ws://localhost/pty');
      socket.accept();
      expect(socket.sent).toStrictEqual([JSON.stringify({ type: 'resize', cols: 80, rows: 24 })]);
    });

    it('reports a close that the server starts', () => {
      const onClose = vi.fn();
      render(<Terminal url="ws://localhost/pty" onClose={onClose} />);

      FakeWebSocket.latest().closeFromServer(4000, 'session ended');

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('closes its socket on unmount without reporting the close', () => {
      const onClose = vi.fn();
      const { unmount } = render(<Terminal url="ws://localhost/pty" onClose={onClose} />);

      unmount();

      expect(FakeWebSocket.latest().readyState).toBe(FakeWebSocket.CLOSED);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('reconnects to a new URL in the same terminal', () => {
      const { rerender } = render(<Terminal url="ws://localhost/one" />);

      rerender(<Terminal url="ws://localhost/two" />);

      expect(FakeWebSocket.instances.map((socket) => [socket.url, socket.readyState])).toStrictEqual([
        ['ws://localhost/one', FakeWebSocket.CLOSED],
        ['ws://localhost/two', FakeWebSocket.CONNECTING],
      ]);
      expect(FakeXterm.instances).toHaveLength(1);
    });
  });
});

// region | Helpers
function createFakeTransport(): {
  transport: TerminalTransport;
  sent: Uint8Array[];
  sizes: TerminalSize[];
  deliver: (data: Uint8Array) => void;
  subscriberCount: () => number;
} {
  const sent: Uint8Array[] = [];
  const sizes: TerminalSize[] = [];
  const subscribers = new Set<(data: Uint8Array) => void>();
  const transport: TerminalTransport = {
    send: (data) => {
      sent.push(data);
    },
    resize: (size) => {
      sizes.push(size);
    },
    subscribe: (onData) => {
      subscribers.add(onData);
      return () => {
        subscribers.delete(onData);
      };
    },
  };
  return {
    transport,
    sent,
    sizes,
    deliver: (data) => {
      for (const subscriber of subscribers) subscriber(data);
    },
    subscriberCount: () => subscribers.size,
  };
}
// endregion | Helpers
