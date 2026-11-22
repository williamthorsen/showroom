import type { ReactElement } from 'react';

import type { UseTankResult } from '#src/tank/useTank.ts';

import { formatCountdown } from './format-countdown.ts';

/** The text of the time until a tank is ready, which updates once per second while the tank refills. */
export function TankCountdown({ tank, format = formatCountdown }: TankCountdownProps): ReactElement {
  return <span className="tank-countdown">{format(tank)}</span>;
}

export interface TankCountdownProps {
  tank: UseTankResult;
  /** Writes the text; `formatCountdown` when omitted. */
  format?: (tank: UseTankResult) => string;
}
