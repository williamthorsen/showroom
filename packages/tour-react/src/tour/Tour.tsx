import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { TourSlide } from './TourSlide.tsx';
import type { TourDirection, TourStep } from './types.ts';

export interface TourProps {
  isOpen: boolean;
  /** Reports that the tour closed, by Finish, the close button, or the Escape key. */
  onOpenChange: (isOpen: boolean) => void;
  steps: readonly TourStep[];
  /** The dialog's accessible name, which stays the same from step to step. */
  label?: string | undefined;
  /** The primary call to action, shown in the footer on the last step. */
  action?: ReactNode;
}

/** Selects the elements in which the arrow keys edit text or choose a value rather than move between steps. */
const EDITABLE_SELECTOR = 'input, select, textarea, [contenteditable]:not([contenteditable="false"])';

/**
 * A product tour: a modal dialog of fixed size that shows one step at a time, with progress dots, Previous, and a forward
 * button that reads Next until the last step and Finish on it. Each opening starts at the first step.
 */
export function Tour({ isOpen, onOpenChange, steps, label = 'Product tour', action }: TourProps): ReactElement | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const forwardRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<TourDirection>('none');
  const lastIndex = steps.length - 1;
  const currentIndex = Math.min(index, lastIndex);
  const isLast = currentIndex === lastIndex;
  const hasSteps = steps.length > 0;

  // Run before paint, so that a reopened tour never shows the step at which it last closed. `hasSteps` re-runs the
  // effect when the dialog mounts late, because its steps arrived after `isOpen` became true.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) {
      setIndex(0);
      setDirection('none');
      dialog.showModal();
      forwardRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [hasSteps, isOpen]);

  const step = steps[currentIndex];
  if (step === undefined) return null;

  function goTo(target: number): void {
    const clamped = Math.max(0, Math.min(target, lastIndex));
    if (clamped === currentIndex) return;
    setDirection(clamped > currentIndex ? 'forward' : 'backward');
    setIndex(clamped);
  }

  function dismiss(): void {
    onOpenChange(false);
  }

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>): void {
    // Keep the open state with the consumer: Escape reports the close, and `isOpen` closes the dialog.
    event.preventDefault();
    dismiss();
  }

  function handleClose(): void {
    // A browser may close the dialog on its own, such as on a second Escape; report it so that `isOpen` follows.
    if (isOpen) dismiss();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR) !== null) return;
    event.preventDefault();
    goTo(currentIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }

  return (
    <dialog
      ref={dialogRef}
      className="tour-dialog"
      aria-labelledby={labelId}
      onCancel={handleCancel}
      onClose={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div className="tour-header">
        <span id={labelId} className="tour-visually-hidden">
          {label}
        </span>
        <button type="button" className="tour-close" aria-label="Close" onClick={dismiss}>
          ×
        </button>
      </div>
      <div className="tour-stage" aria-live="polite">
        <TourSlide key={currentIndex} step={step} index={currentIndex} total={steps.length} direction={direction} />
      </div>
      <div className="tour-footer">
        <div className="tour-dots" role="group" aria-label="Steps">
          {steps.map((dotStep, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className="tour-dot"
              aria-label={`Step ${String(dotIndex + 1)}: ${dotStep.title}`}
              aria-current={dotIndex === currentIndex ? 'step' : undefined}
              onClick={() => goTo(dotIndex)}
            />
          ))}
        </div>
        <div className="tour-actions">
          {isLast && action !== undefined && <div className="tour-action">{action}</div>}
          <button
            type="button"
            className="tour-button"
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
          >
            Previous
          </button>
          {/* One element in both roles, so that focus stays on it when Next becomes Finish. */}
          <button
            ref={forwardRef}
            type="button"
            className="tour-button"
            data-variant="forward"
            onClick={isLast ? dismiss : () => goTo(currentIndex + 1)}
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
