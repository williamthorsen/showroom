import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFirstRunTour } from '../useFirstRunTour.ts';

const KEY = 'app.tour';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe(useFirstRunTour, () => {
  it('opens on the first visit and does not mark the tour seen on open', () => {
    const { result } = renderHook(() => useFirstRunTour(KEY));

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('marks the tour seen on close, so that a later visit starts closed', () => {
    const first = renderHook(() => useFirstRunTour(KEY));
    act(() => first.result.current.onOpenChange(false));

    expect(first.result.current.isOpen).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('1');
    first.unmount();

    const later = renderHook(() => useFirstRunTour(KEY));
    expect(later.result.current.isOpen).toBe(false);
  });

  it('keeps each storage key separate', () => {
    localStorage.setItem('other.tour', '1');

    const { result } = renderHook(() => useFirstRunTour(KEY));
    expect(result.current.isOpen).toBe(true);
  });

  it('reopens through open() without writing to storage', () => {
    localStorage.setItem(KEY, '1');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useFirstRunTour(KEY));

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('treats storage that cannot be read as seen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied', 'SecurityError');
    });

    const { result } = renderHook(() => useFirstRunTour(KEY));
    expect(result.current.isOpen).toBe(false);
  });

  it('closes even when storage refuses the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useFirstRunTour(KEY));

    act(() => result.current.onOpenChange(false));
    expect(result.current.isOpen).toBe(false);
  });
});
