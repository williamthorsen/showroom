<!-- readme-type: library -->

# @williamthorsen/tank-react

React components that show a [`@williamthorsen/tank`](../tank/README.md) balance refilling in the browser: a meter, a countdown, and the hooks beneath them, projected locally between server snapshots.

<!-- section:release-notes --><!-- /section:release-notes -->

```tsx
import { parseSnapshot } from '@williamthorsen/tank';
import { TankCountdown, TankMeter, useTank } from '@williamthorsen/tank-react';
import '@williamthorsen/tank-react/styles.css';

async function fetchSnapshot(signal: AbortSignal) {
  const response = await fetch('/api/tank', { signal });
  return parseSnapshot(await response.json());
}

function ConversionTank({ required }: { required: number }) {
  const tank = useTank({ fetchSnapshot, required });
  return (
    <>
      <TankMeter tank={tank} label="Free conversions" />
      <TankCountdown tank={tank} />
      <button type="button" disabled={tank.status !== 'ready'}>
        Convert
      </button>
    </>
  );
}
```

## Why

A tank's balance is shared by every visitor, and it regenerates continuously. Asking the server for the balance every second would cost a request per visitor per second. The hook fetches a snapshot only when the balance may have changed, and projects it between snapshots with the core's own `projectBalance` and `computeReadyAt`, so that the browser and the server use the same arithmetic.

## Contract

- **Options.** `fetchSnapshot(signal)` resolves to a snapshot that the site has validated. `required` is the amount that the next action reserves, as the site's endpoint reports it, and is `undefined` while the site waits for the endpoint to report it. `refreshIntervalMs` adds a fetch at that interval while the tab is visible.
- **Fetches.** The hook fetches on mount, when the tab becomes visible, and shortly after the projected ready time. The time includes a random delay of up to 3 seconds, so that open tabs do not fetch at one instant. A new fetch aborts the one in flight, and unmounting aborts it too. A change of `required` does not fetch, including the change from `undefined` to an amount.
- **Status.** `ready` when the projected balance covers `required`, and `recharging` otherwise. `loading` lasts until a snapshot has arrived and `required` is defined. `error` reports an invalid `required`, or a fetch that failed before any snapshot arrived. After a snapshot has arrived, a failed fetch sets `error` without changing the status, and the hook keeps projecting the last snapshot.
- **Projection.** `balance` is unrounded and is negative after an overage, and `fraction` is clamped to 0–1. `readyAt` and `msUntilReady` are on the browser's clock, and both are `Infinity` for a tank that does not refill. The fields, and the balance that `projectAt` returns, are `undefined` until a snapshot has arrived and `required` is defined.
- **Snapshots.** `applySnapshot` applies a snapshot that the site's own action returned, including a refusal's. The snapshot with the latest `asOf` wins, whichever way it arrived. `refresh()` fetches now, and it never rejects.
- **Authority.** The projection can be wrong between fetches, because other visitors spend the balance. The server's answer to `reserve` decides, so the site handles a refusal that arrives while the status is `ready`.
- **Snapshot and required.** `snapshot` is the applied snapshot as the server sent it, and `required` is the option that the hook was given, for a component that needs the capacity or the refill rate.

## Meter and countdown

- **`TankMeter`** takes the tank and a `label`, its accessible name. It is a bar with the `meter` role that fills toward a full tank in one CSS animation, without a render on every frame, and restarts from the projected value at each `revision`. A negative balance holds the fill at empty until it is repaid. A mark shows the `required` fraction when it is below capacity. Its `aria-valuetext`, such as "62% full, ready in about 4 minutes", changes at once on a new snapshot or status and otherwise at most once per minute, and a polite live region announces the change to ready.
- **`TankCountdown`** takes the tank and writes "Ready in 3:42" or "Ready", including the time to repay a negative balance. `formatCountdown` writes the same text for a component of its own.
- **`useTankMeter(tank, options)`** returns what a meter of any other form needs: the meter element's props, the live region's props and text, and an animation description (`key`, `fromFraction`, `toFraction`, `delayMs`, `durationMs`) with the live `fraction`. A ring, a battery, or a row of pips renders from it with CSS, the Web Animations API, or a render once per second. The [playground](playground/main.tsx) builds a ring this way.
- **Text.** The text is English. `formatValueText` and `readyText` replace the meter's, and `format` replaces the countdown's.
- **Reduced motion.** Under `prefers-reduced-motion`, the fill does not animate and moves once per second.

## Theming

`styles.css` declares every colour, size, and radius of the components as a `--tank-*` custom property on `:root`, with a dark set under `prefers-color-scheme: dark`. A theme overrides the properties, on `:root` or on any ancestor of the components:

```css
.checkout {
  --tank-meter-fill: #7c3aed;
  --tank-meter-height: 0.75rem;
}
```

The `:root` block of [`styles.css`](styles.css) lists the properties. `--tank-countdown-text` sets the countdown's colour, which otherwise inherits from the host, so the host's text colour decides its contrast.

The [design](../tank/docs/design.md#react-package-williamthorsentank-react) states the refresh policy and the meter's model.

## Scripts

`pnpm run dev` serves the playground, which demonstrates the components over the in-memory store.

Workspace scripts (`build`, `check`, `lint`, `test`, `typecheck`) are run with `nmr`, as [Running scripts](../../README.md#running-scripts) in the root README describes. Run `nmr` from this directory to list this package's scripts.
