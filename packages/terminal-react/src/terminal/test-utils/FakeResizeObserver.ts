/** A stand-in for `ResizeObserver`, which jsdom lacks, installed with `vi.stubGlobal`; a test fires it by `trigger`. */
export class FakeResizeObserver {
  static readonly instances: FakeResizeObserver[] = [];

  readonly observed = new Set<Element>();
  private readonly callback: () => void;

  constructor(callback: () => void) {
    this.callback = callback;
    FakeResizeObserver.instances.push(this);
  }

  /** Starts observing an element. */
  observe(element: Element): void {
    this.observed.add(element);
  }

  /** Stops observing every element. */
  disconnect(): void {
    this.observed.clear();
  }

  /** Runs the callback, as a change in an observed element's size does. */
  trigger(): void {
    if (this.observed.size > 0) this.callback();
  }
}
