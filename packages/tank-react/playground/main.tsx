import { createMemoryStore, createTank, type Snapshot } from '@williamthorsen/tank';
import { type CSSProperties, type ReactElement, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { formatCountdown, TankCountdown, TankMeter, useTank, useTankMeter, type UseTankResult } from '../src/index.ts';

import '../styles.css';

// Capacity 10, refilling 1 unit every 2 seconds, so that a full refill takes 20 seconds.
const tank = createTank({
  config: { capacity: 10, refillAmount: 1, refillIntervalMs: 2000 },
  store: createMemoryStore(),
  key: 'playground',
});

const REQUIRED_CHOICES = [4, 10];

// An overage of 10 over a reservation of 4 drives a full tank to -4, above the default floor of -10.
const OVERAGE = 10;

/** The playground: the default bar and countdown, and a ring built from the headless hook alone. */
function App(): ReactElement {
  const [required, setRequired] = useState(4);
  const [message, setMessage] = useState('');
  const result = useTank({ fetchSnapshot, required });

  async function spend(consumed: number): Promise<void> {
    const reserved = await tank.reserve(required);
    if (!reserved.ok) {
      result.applySnapshot(reserved.snapshot);
      setMessage(
        reserved.reason === 'insufficient'
          ? `Not enough balance. ${formatCountdown({ status: 'recharging', msUntilReady: reserved.readyAt - Date.now() })}.`
          : 'The store is busy. Try again.',
      );
      return;
    }
    setMessage('');
    result.applySnapshot(await reserved.reservation.settle(consumed));
  }

  return (
    <main>
      <h1>tank-react playground</h1>
      <section>
        <h2>Bar</h2>
        <TankMeter tank={result} label="Free conversions" />
        <TankCountdown tank={result} />
      </section>
      <section>
        <h2>Ring</h2>
        <TankRing tank={result} />
      </section>
      <div className="actions">
        <button type="button" onClick={() => void spend(required)}>
          Spend
        </button>
        <button type="button" onClick={() => void spend(required + OVERAGE)}>
          Spend with overage
        </button>
        <label>
          Required{' '}
          <select value={required} onChange={(event) => setRequired(Number(event.target.value))}>
            {REQUIRED_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="message" aria-live="polite">
        {message}
      </p>
    </main>
  );
}

// region | Helpers
function fetchSnapshot(): Promise<Snapshot> {
  return tank.peek();
}

/** A ring that fills as the balance regenerates, built from `useTankMeter` and its own CSS alone. */
function TankRing({ tank: result }: { tank: UseTankResult }): ReactElement {
  const meter = useTankMeter(result, { label: 'Free conversions, as a ring' });
  const { animation } = meter;
  type CustomStyle = CSSProperties & Record<`--${string}`, string>;
  const style: CustomStyle = {
    '--ring-from': String(animation.fromFraction),
    '--ring-to': String(animation.toFraction),
    '--ring-now': String(meter.fraction),
    '--ring-delay': `${animation.delayMs}ms`,
    '--ring-duration': `${animation.durationMs}ms`,
  };
  return (
    <>
      <div className="ring" data-status={meter.status} {...meter.meterProps}>
        <div key={animation.key} className="ring-fill" style={style} />
      </div>
      <span className="tank-visually-hidden" {...meter.liveRegionProps}>
        {meter.announcement}
      </span>
    </>
  );
}
// endregion | Helpers

const root = document.querySelector('#root');
if (root === null) throw new Error('The playground needs a #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
