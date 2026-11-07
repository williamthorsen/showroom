/**
 * Gives jsdom's elements the pointer-capture methods, which jsdom does not implement: an element holds the captures that
 * it set until it releases them.
 */
export function stubPointerCapture(): void {
  const captures = new WeakMap<Element, Set<number>>();
  Element.prototype.setPointerCapture = function setPointerCapture(this: Element, pointerId: number): void {
    const held = captures.get(this) ?? new Set<number>();
    held.add(pointerId);
    captures.set(this, held);
  };
  Element.prototype.hasPointerCapture = function hasPointerCapture(this: Element, pointerId: number): boolean {
    return captures.get(this)?.has(pointerId) ?? false;
  };
  Element.prototype.releasePointerCapture = function releasePointerCapture(this: Element, pointerId: number): void {
    captures.get(this)?.delete(pointerId);
  };
}
