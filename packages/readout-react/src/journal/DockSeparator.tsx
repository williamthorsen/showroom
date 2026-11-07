import type { KeyboardEvent, PointerEvent, ReactElement } from 'react';

export interface DockSeparatorProps {
  /** The dock's size in pixels. */
  size: number;
  min: number;
  max: number;
  /** `horizontal` for a dock on the bottom edge, `vertical` for one on the right edge. */
  orientation: 'horizontal' | 'vertical';
  label: string;
  /** Reports the size that a drag or a key asks for, before any clamp. */
  onResize: (size: number) => void;
  /** Reports that a drag started or ended. */
  onDragChange: (isDragging: boolean) => void;
}

/** How far an arrow key resizes the dock, and how far it does with Shift held. */
const KEY_STEP_PX = 16;
const LARGE_KEY_STEP_PX = 64;

/**
 * The window splitter on a dock's inner edge, which resizes the dock by pointer drag and by arrow keys, Home, and End.
 */
export function DockSeparator({
  size,
  min,
  max,
  orientation,
  label,
  onResize,
  onDragChange,
}: DockSeparatorProps): ReactElement {
  const [growKey, shrinkKey] = orientation === 'horizontal' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? LARGE_KEY_STEP_PX : KEY_STEP_PX;
    const next =
      event.key === growKey
        ? size + step
        : event.key === shrinkKey
          ? size - step
          : event.key === 'Home'
            ? min
            : event.key === 'End'
              ? max
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onResize(next);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragChange(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    // The dock is fixed to the layout viewport's edge, which excludes a scrollbar, so its size is the pointer's distance
    // from that edge.
    const { clientHeight, clientWidth } = document.documentElement;
    onResize(orientation === 'horizontal' ? clientHeight - event.clientY : clientWidth - event.clientX);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>): void {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onDragChange(false);
  }

  return (
    <div
      className="readout-dock-separator"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={size}
      aria-valuemin={min}
      aria-valuemax={max}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    />
  );
}
