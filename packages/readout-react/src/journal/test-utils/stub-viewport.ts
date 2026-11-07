/**
 * Sets the layout viewport's extent that the root element reports, which jsdom leaves at 0, until `restoreViewport`
 * removes it.
 */
export function stubViewport(width: number, height: number): void {
  Object.defineProperties(document.documentElement, {
    clientWidth: { configurable: true, value: width },
    clientHeight: { configurable: true, value: height },
  });
}

/** Removes the extent that `stubViewport` set, so that the root element reports jsdom's own again. */
export function restoreViewport(): void {
  const root = document.documentElement;
  Reflect.deleteProperty(root, 'clientWidth');
  Reflect.deleteProperty(root, 'clientHeight');
}
