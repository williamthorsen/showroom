interface Disposable {
  dispose(): void;
}

interface Addon {
  activate(terminal: FakeXterm): void;
}

/** A stand-in for xterm's `Terminal`, installed with `vi.mock`, that records what it is given and emits its events. */
export class FakeXterm {
  static readonly instances: FakeXterm[] = [];

  readonly options: { theme?: unknown } = {};
  readonly written: (string | Uint8Array)[] = [];
  cols = 80;
  rows = 24;
  /** The size that the next `fit` of the fake fit addon applies. */
  proposedSize: { cols: number; rows: number } | undefined;
  element: HTMLElement | undefined;
  isDisposed = false;

  private readonly dataListeners = new Set<(data: string) => void>();
  private readonly binaryListeners = new Set<(data: string) => void>();
  private readonly resizeListeners = new Set<(size: { cols: number; rows: number }) => void>();

  constructor() {
    FakeXterm.instances.push(this);
  }

  /** Returns the most recently created instance. */
  static latest(): FakeXterm {
    const terminal = this.instances.at(-1);
    if (terminal === undefined) throw new Error('No FakeXterm has been created.');
    return terminal;
  }

  /** Records the element in which the terminal opens. */
  open(element: HTMLElement): void {
    this.element = element;
  }

  /** Activates an addon against this terminal. */
  loadAddon(addon: Addon): void {
    addon.activate(this);
  }

  /** Records bytes written to the screen. */
  write(data: string | Uint8Array): void {
    this.written.push(data);
  }

  /** Marks the terminal disposed. */
  dispose(): void {
    this.isDisposed = true;
  }

  /** Registers a listener for typed input. */
  onData(listener: (data: string) => void): Disposable {
    return subscribe(this.dataListeners, listener);
  }

  /** Registers a listener for binary input. */
  onBinary(listener: (data: string) => void): Disposable {
    return subscribe(this.binaryListeners, listener);
  }

  /** Registers a listener for changes of grid size. */
  onResize(listener: (size: { cols: number; rows: number }) => void): Disposable {
    return subscribe(this.resizeListeners, listener);
  }

  /** Emits typed input, as a keystroke does. */
  emitData(data: string): void {
    for (const listener of this.dataListeners) listener(data);
  }

  /** Emits binary input, one byte per character. */
  emitBinary(data: string): void {
    for (const listener of this.binaryListeners) listener(data);
  }

  /** Changes the grid size and emits the resize event when the size differs, as xterm's `resize` does. */
  resize(cols: number, rows: number): void {
    if (cols === this.cols && rows === this.rows) return;
    this.cols = cols;
    this.rows = rows;
    for (const listener of this.resizeListeners) listener({ cols, rows });
  }
}

/** A stand-in for xterm's `FitAddon` that applies the terminal's `proposedSize` on each `fit` and counts the calls. */
export class FakeFitAddon {
  fitCount = 0;
  private terminal: FakeXterm | undefined;

  /** Binds the addon to its terminal. */
  activate(terminal: FakeXterm): void {
    this.terminal = terminal;
  }

  /** Applies the terminal's proposed size, if one is set. */
  fit(): void {
    this.fitCount++;
    const size = this.terminal?.proposedSize;
    if (size !== undefined) this.terminal?.resize(size.cols, size.rows);
  }
}

// region | Helpers
function subscribe<T>(listeners: Set<(value: T) => void>, listener: (value: T) => void): Disposable {
  listeners.add(listener);
  return {
    dispose: () => {
      listeners.delete(listener);
    },
  };
}
// endregion | Helpers
