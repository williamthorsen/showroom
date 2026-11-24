import { type CSSProperties, type ReactElement, type ReactNode, useId } from 'react';

import type { UseTankResult } from '#src/tank/useTank.ts';

import type { FillAnimation } from './fill-animation.ts';
import { describeSegmentAnimation } from './segment-animation.ts';
import { useTankMeter, type UseTankMeterOptions } from './useTankMeter.ts';
import { formatDefaultRequired } from './value-text.ts';

/**
 * A bar that fills as a tank's balance regenerates, under a header that shows its label and value, with a segment as
 * wide as the amount that the next action reserves and a legend that names it.
 */
export function TankMeter(props: TankMeterProps): ReactElement {
  const { tank, icon, description, formatRequired = formatDefaultRequired, ...options } = props;
  const meter = useTankMeter(tank, options);
  const id = useId();
  const descriptionId = `${id}-description`;
  const legendId = `${id}-legend`;
  const { animation, requiredFraction } = meter;
  const fillStyle: CustomStyle = {
    '--tank-meter-from': String(animation.fromFraction),
    '--tank-meter-to': String(animation.toFraction),
    '--tank-meter-now': String(meter.fraction),
    '--tank-meter-delay': `${animation.delayMs}ms`,
    '--tank-meter-duration': `${animation.durationMs}ms`,
  };
  const { required, snapshot } = tank;
  const reservation =
    requiredFraction === undefined || required === undefined || snapshot === undefined
      ? undefined
      : { fraction: requiredFraction, text: formatRequired(required, snapshot.capacity) };
  const describedBy = [description === undefined ? '' : descriptionId, reservation === undefined ? '' : legendId]
    .filter(Boolean)
    .join(' ');
  // The visible text is hidden from assistive technology, which reads the name, the value, and the description from
  // the meter's attributes; browsers expose a meter's children rather than treating them as presentational.
  return (
    <>
      <div
        className="tank-meter"
        data-status={meter.status}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        {...meter.meterProps}
      >
        <div className="tank-meter-header" aria-hidden="true">
          {icon === undefined ? undefined : <span className="tank-meter-icon">{icon}</span>}
          <span className="tank-meter-label">{options.label}</span>
          <span className="tank-meter-value">{meter.valueLabel}</span>
          {description === undefined ? undefined : (
            <span id={descriptionId} className="tank-meter-description">
              {description}
            </span>
          )}
        </div>
        <div className="tank-meter-bar">
          <div className="tank-meter-track">
            <div key={animation.key} className="tank-meter-fill" style={fillStyle} />
          </div>
          {reservation === undefined ? undefined : (
            <div className="tank-meter-segment-layer">
              <div
                key={animation.key}
                className="tank-meter-segment-end"
                style={describeSegmentStyle(animation, meter.fraction, reservation.fraction)}
              >
                <div className="tank-meter-segment" />
              </div>
            </div>
          )}
        </div>
        {reservation === undefined ? undefined : (
          <div id={legendId} className="tank-meter-legend" aria-hidden="true">
            <span className="tank-meter-swatch" />
            {reservation.text}
          </div>
        )}
      </div>
      <span className="tank-visually-hidden" {...meter.liveRegionProps}>
        {meter.announcement}
      </span>
    </>
  );
}

export interface TankMeterProps extends UseTankMeterOptions {
  tank: UseTankResult;
  /** A decorative icon before the label. */
  icon?: ReactNode;
  /** One line under the label that says what the balance is and when it refills; the meter's accessible description. */
  description?: ReactNode;
  /** Writes the legend of the reservation segment. The default writes the percentage, such as "Needs 40%". */
  formatRequired?: (required: number, capacity: number) => string;
}

// region | Helpers
type CustomStyle = CSSProperties & Record<`--${string}`, string>;

function describeSegmentStyle(fill: FillAnimation, fraction: number, requiredFraction: number): CustomStyle {
  const segment = describeSegmentAnimation(fill, requiredFraction);
  return {
    '--tank-meter-segment-size': String(requiredFraction),
    '--tank-meter-segment-from': String(segment.fromFraction),
    '--tank-meter-segment-to': String(segment.toFraction),
    '--tank-meter-segment-now': String(Math.max(fraction, requiredFraction)),
    '--tank-meter-segment-delay': `${segment.delayMs}ms`,
    '--tank-meter-segment-duration': `${segment.durationMs}ms`,
  };
}
// endregion | Helpers
