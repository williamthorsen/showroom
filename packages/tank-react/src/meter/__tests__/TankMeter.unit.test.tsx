import { act, cleanup, render, screen } from '@testing-library/react';
import type { Snapshot } from '@williamthorsen/tank';
import { type ReactElement, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTank, type UseTankResult } from '#src/tank/useTank.ts';
import { advance, flush } from '#src/test-utils/act-timers.ts';

import { TankMeter } from '../TankMeter.tsx';

const START = 1_000_000;

// Capacity 10, refilling 1 unit per second.
const BASE: Snapshot = { balance: 2, capacity: 10, refillAmount: 1, refillIntervalMs: 1000, asOf: START };

beforeEach(() => {
  vi.useFakeTimers({ now: START });
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe(TankMeter, () => {
  it('renders the meter role with its name and value attributes', async () => {
    renderMeter(8);
    await flush();

    const meter = screen.getByRole('meter', { name: 'Credits' });
    const attributes = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'data-status'];
    expect(Object.fromEntries(attributes.map((name) => [name, meter.getAttribute(name)]))).toStrictEqual({
      'aria-valuemin': '0',
      'aria-valuemax': '10',
      'aria-valuenow': '2',
      'aria-valuetext': '20% full, ready in less than a minute',
      'data-status': 'recharging',
    });
  });

  it('sets the animation of the fill from the hook', async () => {
    renderMeter(8);
    await flush();

    expect(readFill().style.getPropertyValue('--tank-meter-from')).toBe('0.2');
    expect(readFill().style.getPropertyValue('--tank-meter-to')).toBe('1');
    expect(readFill().style.getPropertyValue('--tank-meter-delay')).toBe('0ms');
    expect(readFill().style.getPropertyValue('--tank-meter-duration')).toBe('8000ms');
  });

  it('keeps the fill element across re-renders of one revision, and updates its current fraction', async () => {
    renderMeter(8);
    await flush();
    const fill = readFill();

    await advance(3000);

    expect(readFill()).toBe(fill);
    expect(fill.style.getPropertyValue('--tank-meter-now')).toBe('0.5');
  });

  it('remounts the fill at a new revision', async () => {
    const handle = renderMeter(8);
    await flush();
    const fill = readFill();

    act(() => handle.current?.applySnapshot({ ...BASE, balance: -3, asOf: Date.now() }));

    expect(readFill()).not.toBe(fill);
    expect(readFill().style.getPropertyValue('--tank-meter-delay')).toBe('3000ms');
  });

  it('places the mark at the required fraction', async () => {
    renderMeter(4);
    await flush();

    expect(readMark()?.style.getPropertyValue('--tank-meter-mark-at')).toBe('0.4');
  });

  it('omits the mark when the next action needs the whole capacity', async () => {
    renderMeter(10);
    await flush();

    expect(readMark()).toBeNull();
  });

  it('renders as loading, without a mark or a fill, while the required amount is undefined', async () => {
    renderMeter(undefined);
    await flush();

    const meter = screen.getByRole('meter', { name: 'Credits' });
    expect(meter.getAttribute('aria-valuetext')).toBe('Loading');
    expect(meter.dataset['status']).toBe('loading');
    expect(readMark()).toBeNull();
    expect(readFill().style.getPropertyValue('--tank-meter-to')).toBe('0');
  });

  it('renders the live region from mount, and fills it on the change to ready', async () => {
    renderMeter(4);

    expect(screen.getByRole('status').textContent).toBe('');

    await flush();
    await advance(2000);

    expect(screen.getByRole('status').textContent).toBe('Ready');
  });
});

// region | Helpers
interface Handle {
  current: UseTankResult | undefined;
}

function readFill(): HTMLElement {
  const fill = document.querySelector<HTMLElement>('.tank-meter-fill');
  if (fill === null) {
    throw new Error('The fill is not rendered');
  }
  return fill;
}

function readMark(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tank-meter-mark');
}

// Answers with the snapshot of a server that held `BASE` at `START`, as the ready refetch would receive it.
function serveBase(): Promise<Snapshot> {
  const now = Date.now();
  return Promise.resolve({ ...BASE, balance: Math.min(BASE.capacity, BASE.balance + (now - START) / 1000), asOf: now });
}

/** Renders a meter over a tank that holds `BASE`, and returns a handle to the tank's latest result. */
function renderMeter(required: number | undefined): Handle {
  const handle: Handle = { current: undefined };
  function Harness(): ReactElement {
    const tank = useTank({ fetchSnapshot: serveBase, required });
    useImperativeHandle(handle, () => tank);
    return <TankMeter tank={tank} label="Credits" />;
  }
  render(<Harness />);
  return handle;
}
// endregion | Helpers
