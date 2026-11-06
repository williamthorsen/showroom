/**
 * Gives jsdom's dialog element the `showModal` and `close` methods, which jsdom does not implement: `showModal` opens
 * the dialog, and `close` closes it and dispatches `close`, as a browser does.
 */
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement): void {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
