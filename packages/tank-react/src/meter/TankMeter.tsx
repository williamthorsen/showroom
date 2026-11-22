import type { CSSProperties, ReactElement } from 'react';

import type { UseTankResult } from '#src/tank/useTank.ts';

import { useTankMeter, type UseTankMeterOptions } from './useTankMeter.ts';

/** A bar that fills as a tank's balance regenerates, with a mark at the amount that the next action needs. */
export function TankMeter(props: TankMeterProps): ReactElement {
  const { tank, ...options } = props;
  const meter = useTankMeter(tank, options);
  const { animation, requiredFraction } = meter;
  type CustomStyle = CSSProperties & Record<`--${string}`, string>;
  const fillStyle: CustomStyle = {
    '--tank-meter-from': String(animation.fromFraction),
    '--tank-meter-to': String(animation.toFraction),
    '--tank-meter-now': String(meter.fraction),
    '--tank-meter-delay': `${animation.delayMs}ms`,
    '--tank-meter-duration': `${animation.durationMs}ms`,
  };
  const markStyle: CustomStyle = { '--tank-meter-mark-at': String(requiredFraction) };
  return (
    <>
      <div className="tank-meter" data-status={meter.status} {...meter.meterProps}>
        <div className="tank-meter-track">
          <div key={animation.key} className="tank-meter-fill" style={fillStyle} />
        </div>
        {requiredFraction === undefined ? undefined : <div className="tank-meter-mark" style={markStyle} />}
      </div>
      <span className="tank-visually-hidden" {...meter.liveRegionProps}>
        {meter.announcement}
      </span>
    </>
  );
}

export interface TankMeterProps extends UseTankMeterOptions {
  tank: UseTankResult;
}
