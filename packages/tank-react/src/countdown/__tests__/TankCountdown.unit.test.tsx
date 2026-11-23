import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { UseTankResult } from '#src/tank/useTank.ts';

import { TankCountdown } from '../TankCountdown.tsx';

const TANK: UseTankResult = {
  status: 'recharging',
  error: undefined,
  balance: 2,
  fraction: 0.2,
  readyAt: 222_000,
  msUntilReady: 222_000,
  snapshot: undefined,
  required: 4,
  revision: 1,
  projectAt: () => 2,
  refresh: () => Promise.resolve(),
  applySnapshot: () => {},
};

afterEach(() => {
  cleanup();
});

describe(TankCountdown, () => {
  it('writes the default text', () => {
    render(<TankCountdown tank={TANK} />);

    expect(screen.getByText('Ready in 3:42').className).toBe('tank-countdown');
  });

  it('writes an empty text while the required amount is undefined', () => {
    const loading: UseTankResult = {
      ...TANK,
      status: 'loading',
      balance: undefined,
      fraction: undefined,
      readyAt: undefined,
      msUntilReady: undefined,
      required: undefined,
      projectAt: () => undefined,
    };
    const { container } = render(<TankCountdown tank={loading} />);

    expect(container.querySelector('.tank-countdown')?.textContent).toBe('');
  });

  it('writes a custom text', () => {
    render(<TankCountdown tank={TANK} format={(tank) => `${tank.msUntilReady} ms`} />);

    expect(screen.getByText('222000 ms').className).toBe('tank-countdown');
  });
});
