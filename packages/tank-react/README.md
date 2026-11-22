<!-- readme-type: library -->

# @williamthorsen/tank-react

A React hook that shows a [`@williamthorsen/tank`](../tank/README.md) balance in the browser: how much is available, and when the next action is covered, projected locally between server snapshots.

<!-- section:release-notes --><!-- /section:release-notes -->

```tsx
import { parseSnapshot } from '@williamthorsen/tank';
import { useTank } from '@williamthorsen/tank-react';

async function fetchSnapshot(signal: AbortSignal) {
  const response = await fetch('/api/tank', { signal });
  return parseSnapshot(await response.json());
}

function ConvertButton({ required }: { required: number }) {
  const tank = useTank({ fetchSnapshot, required });
  return (
    <button type="button" disabled={tank.status !== 'ready'}>
      {tank.status === 'recharging' ? `Ready in ${Math.ceil((tank.msUntilReady ?? 0) / 1000)} s` : 'Convert'}
    </button>
  );
}
```

## Why

A tank's balance is shared by every visitor, and it regenerates continuously. Asking the server for the balance every second would cost a request per visitor per second. The hook fetches a snapshot only when the balance may have changed, and projects it between snapshots with the core's own `projectBalance` and `computeReadyAt`, so that the browser and the server use the same arithmetic.

## Contract

- **Options.** `fetchSnapshot(signal)` resolves to a snapshot that the site has validated. `required` is the amount that the next action reserves, as the site's endpoint reports it. `refreshIntervalMs` adds a fetch at that interval while the tab is visible.
- **Fetches.** The hook fetches on mount, when the tab becomes visible, and shortly after the projected ready time. The time includes a random delay of up to 3 seconds, so that open tabs do not fetch at one instant. A new fetch aborts the one in flight, and unmounting aborts it too. A change of `required` does not fetch.
- **Status.** `ready` when the projected balance covers `required`, and `recharging` otherwise. `loading` lasts until the first snapshot arrives. `error` reports an invalid `required`, or a fetch that failed before any snapshot arrived. After a snapshot has arrived, a failed fetch sets `error` and keeps projecting the last snapshot.
- **Projection.** `balance` is unrounded and is negative after an overage, and `fraction` is clamped to 0–1. `readyAt` and `msUntilReady` are on the browser's clock, and both are `Infinity` for a tank that does not refill. The fields are `undefined` until a snapshot arrives.
- **Snapshots.** `applySnapshot` applies a snapshot that the site's own action returned, including a refusal's. The snapshot with the latest `asOf` wins, whichever way it arrived. `refresh()` fetches now, and it never rejects.
- **Authority.** The projection can be wrong between fetches, because other visitors spend the balance. The server's answer to `reserve` decides, so the site handles a refusal that arrives while the status is `ready`.

The [design](../tank/docs/design.md#react-package-williamthorsentank-react) states the refresh policy and the components that will consume `revision` and `projectAt`.

## Scripts

Workspace scripts (`build`, `check`, `lint`, `test`, `typecheck`) are run with `nmr`, as [Running scripts](../../README.md#running-scripts) in the root README describes. Run `nmr` from this directory to list this package's scripts.
