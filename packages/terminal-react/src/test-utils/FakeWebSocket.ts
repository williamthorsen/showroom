/**
 * A stand-in for the browser's `WebSocket`, installed with `vi.stubGlobal`, that records what is sent and lets a test
 * play the server's part. Every instance is kept in `instances`, which a test clears between cases.
 */
export class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static readonly instances: FakeWebSocket[] = [];

  readonly url: string;
  readonly sent: (string | Uint8Array)[] = [];
  binaryType = 'blob';
  readyState = FakeWebSocket.CONNECTING;

  constructor(url: string | URL) {
    super();
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }

  /** Returns the most recently created instance. */
  static latest(): FakeWebSocket {
    const socket = this.instances.at(-1);
    if (socket === undefined) throw new Error('No FakeWebSocket has been created.');
    return socket;
  }

  /** Records a frame that the client sends. */
  send(data: string | Uint8Array): void {
    this.sent.push(data);
  }

  /** Closes the socket from the client's side. */
  close(): void {
    this.closeWith(1005, '');
  }

  /** Opens the socket, as the server's acceptance of the connection does. */
  accept(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  /**
   * Delivers a binary frame from the server that contains the UTF-8 bytes of `text`. The buffer comes from the global
   * `ArrayBuffer`, which under jsdom is not the one behind `TextEncoder`'s output.
   */
  receiveBinary(text: string): void {
    const encoded = new TextEncoder().encode(text);
    const buffer = new ArrayBuffer(encoded.length);
    new Uint8Array(buffer).set(encoded);
    this.dispatchEvent(new MessageEvent('message', { data: buffer }));
  }

  /** Delivers a text frame from the server. */
  receiveText(text: string): void {
    this.dispatchEvent(new MessageEvent('message', { data: text }));
  }

  /** Closes the socket from the server's side. */
  closeFromServer(code: number, reason: string): void {
    this.closeWith(code, reason);
  }

  private closeWith(code: number, reason: string): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent('close', { code, reason }));
  }
}
