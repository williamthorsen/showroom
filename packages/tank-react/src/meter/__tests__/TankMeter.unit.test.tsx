import { act, cleanup, render, screen } from '@testing-library/react';
import type { Snapshot } from '@williamthorsen/tank';
import { type ReactElement, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTank, type UseTankResult } from '#src/tank/useTank.ts';
import { advance, flush } from '#src/test-utils/act-timers.ts';

import { TankMeter, type TankMeterProps } from '../TankMeter.tsx';

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

  it('shows the label and the value as text inside the meter', async () => {
    renderMeter(8);
    await flush();

    const meter = screen.getByRole('meter', { name: 'Credits' });
    expect(meter.querySelector('.tank-meter-label')?.textContent).toBe('Credits');
    expect(meter.querySelector('.tank-meter-value')?.textContent).toBe('20%');
  });

  it('describes the meter by its description, and hides its icon', async () => {
    renderMeter(8, { icon: <svg data-testid="icon" />, description: 'Shared by every visitor' });
    await flush();

    expect(screen.getByRole('meter', { name: 'Credits', description: 'Shared by every visitor' })).toBeDefined();
    expect(screen.getByTestId('icon').closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('places the segment at the end of the fill while the balance covers the reservation', async () => {
    renderMeter(1);
    await flush();

    expect(readSegmentStyle()).toStrictEqual({
      size: '0.1',
      from: '0.2',
      to: '1',
      now: '0.2',
      delay: '0ms',
      duration: '8000ms',
    });
  });

  it('holds the segment at the start of the track until the fill reaches the reservation', async () => {
    renderMeter(4);
    await flush();

    expect(readSegmentStyle()).toStrictEqual({
      size: '0.4',
      from: '0.4',
      to: '1',
      now: '0.4',
      delay: '2000ms',
      duration: '6000ms',
    });
  });

  it('names the segment in a legend', async () => {
    renderMeter(4);
    await flush();

    expect(readLegend()?.textContent).toBe('Needs 40%');
  });

  it('takes a custom legend', async () => {
    renderMeter(4, { formatRequired: (required, capacity) => `${required} of ${capacity} per use` });
    await flush();

    expect(readLegend()?.textContent).toBe('4 of 10 per use');
  });

  it('omits the segment and the legend when the next action needs the whole capacity', async () => {
    renderMeter(10);
    await flush();

    expect(document.querySelector('.tank-meter-segment')).toBeNull();
    expect(readLegend()).toBeNull();
  });

  it('renders as loading, without a segment or a fill, while the required amount is undefined', async () => {
    renderMeter(undefined);
    await flush();

    const meter = screen.getByRole('meter', { name: 'Credits' });
    expect(meter.getAttribute('aria-valuetext')).toBe('Loading');
    expect(meter.dataset['status']).toBe('loading');
    expect(meter.querySelector('.tank-meter-value')?.textContent).toBe('Loading');
    expect(document.querySelector('.tank-meter-segment')).toBeNull();
    expect(readLegend()).toBeNull();
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

function readLegend(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.tank-meter-legend');
}

function readSegmentStyle(): Record<string, string> {
  const end = document.querySelector<HTMLElement>('.tank-meter-segment-end');
  if (end === null) {
    throw new Error('The segment is not rendered');
  }
  const names = ['size', 'from', 'to', 'now', 'delay', 'duration'];
  return Object.fromEntries(names.map((name) => [name, end.style.getPropertyValue(`--tank-meter-segment-${name}`)]));
}

// Answers with the snapshot of a server that held `BASE` at `START`, as the ready refetch would receive it.
function serveBase(): Promise<Snapshot> {
  const now = Date.now();
  return Promise.resolve({ ...BASE, balance: Math.min(BASE.capacity, BASE.balance + (now - START) / 1000), asOf: now });
}

/** Renders a meter over a tank that holds `BASE`, and returns a handle to the tank's latest result. */
function renderMeter(required: number | undefined, props: Partial<TankMeterProps> = {}): Handle {
  const handle: Handle = { current: undefined };
  function Harness(): ReactElement {
    const tank = useTank({ fetchSnapshot: serveBase, required });
    useImperativeHandle(handle, () => tank);
    return <TankMeter tank={tank} label="Credits" {...props} />;
  }
  render(<Harness />);
  return handle;
}
// endregion | Helpers
