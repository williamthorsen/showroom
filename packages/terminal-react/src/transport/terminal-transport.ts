/** A terminal grid's size in character cells. */
export interface TerminalSize {
  cols: number;
  rows: number;
}

/** The channel between a terminal and the process behind it: bytes in both directions, plus the grid's size. */
export interface TerminalTransport {
  /** Sends bytes that the terminal produced, such as keystrokes, to the process. */
  send(data: Uint8Array<ArrayBuffer>): void;
  /** Reports the terminal's current size to the process. */
  resize(size: TerminalSize): void;
  /** Delivers each chunk of bytes from the process to `onData`, until the returned function is called. */
  subscribe(onData: (data: Uint8Array) => void): () => void;
}
