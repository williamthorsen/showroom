/**
 * Stubs `showModal` and `close` on `HTMLDialogElement`, which jsdom declares without implementing. The stubs toggle the
 * `open` attribute, and `close` dispatches the `close` event, as a browser does.
 */
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
