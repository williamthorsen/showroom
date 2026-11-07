<!-- readme-type: library -->

# @williamthorsen/terminal-react

A React terminal component over [xterm.js](https://xtermjs.org/) that attaches to a WebSocket, fits its grid to its container, and reports each new size to the server.

<!-- section:release-notes --><!-- /section:release-notes -->

```tsx
import { Terminal } from '@williamthorsen/terminal-react';
import '@williamthorsen/terminal-react/styles.css';

<div style={{ height: '20rem' }}>
  <Terminal url="wss://example.test/pty?token=…" />
</div>;
```

## Why

A browser terminal needs the same pieces in every app that hosts one: an xterm instance mounted in React, a grid that refits when its container changes size, and a channel that carries bytes both ways plus the grid's size. `@xterm/xterm` supplies the emulator alone, and its attach addon sends keystrokes as text frames and has no way to report a size. The React wrappers for xterm, such as `react-xtermjs`, handle mounting only. This package adds the fitting, a transport seam, and a [wire protocol](#wire-protocol) that a server implements in a few lines, and it knows nothing about the process behind the socket.

React 19 is a peer dependency (`^19.0.0`). `@xterm/xterm` and `@xterm/addon-fit` are dependencies.

## Props

`Terminal` takes either `url` or `transport`:

- `url`: The component opens a WebSocket at this URL and closes it on unmount. A browser cannot set headers on a WebSocket, so a credential travels in the URL. A new `url` closes the socket and opens one at the new URL in the same terminal.
- `onClose` (with `url` only): Receives the socket's `CloseEvent`, with its `code` and `reason`, when the socket closes for any reason other than an unmount or a change of `url`.
- `transport`: A [`TerminalTransport`](#transport) that the consumer supplies and owns.
- `theme`: xterm's `ITheme`, re-exported by this package. A change applies to the open terminal.
- `className`: Added to the component's root element, whose class is `terminal-react`.

The component fills its parent, so the parent sets its size.

## Keyboard focus

Tab and Shift+Tab are terminal input, as they are in any terminal. Escape, then Tab or Shift+Tab, moves focus to the next or the previous focusable element; Escape still reaches the process, and any other key after it, a paste, or a move of focus away from the terminal cancels the escape. The terminal's input states the escape as its accessible description, so a screen reader announces it on focus.

## Styles

`styles.css` imports xterm's stylesheet, so a consumer imports only this one file. It sizes the component and draws a focus ring in the custom property `--terminal-react-focus` (default `#3b82f6`). The ring is drawn inside the component, against the terminal's background, so a colour that replaces it must reach 3:1 against both that background and the page's.

## Transport

`TerminalTransport` is the channel between the terminal and the process behind it:

```ts
interface TerminalTransport {
  send(data: Uint8Array<ArrayBuffer>): void;
  resize(size: { cols: number; rows: number }): void;
  subscribe(onData: (data: Uint8Array) => void): () => void;
}
```

The component calls `resize` once when it subscribes and again after every refit. `createWebSocketTransport(url, { onClose })` is the transport behind `url`, with a `close()` method added. It holds bytes sent before the socket opens and sends the latest size when it opens.

## Wire protocol

- **Binary frames** carry terminal bytes in both directions: the process's output to the client, and keystrokes, UTF-8 encoded, to the server.
- **Text frames** carry JSON control messages. The client sends one, `ResizeMessage`, when the socket opens and after every refit:

  ```json
  { "type": "resize", "cols": 120, "rows": 40 }
  ```

- The client ignores text frames from the server, so that a server may add control messages without breaking this version.

The playground's echo server, in [`playground/vite.config.ts`](https://github.com/williamthorsen/showroom/blob/main/packages/terminal-react/playground/vite.config.ts), is a complete server-side example.
