<!-- readme-type: library -->

# @williamthorsen/tank

A balance that regenerates at a configured rate, so that a site can offer an action whose cost the operator pays, such as an LLM call, while the operator's spend stays bounded.

<!-- section:release-notes --><!-- /section:release-notes -->

```ts
import { createMemoryStore, createTank } from '@williamthorsen/tank';

// One dollar in micro-dollars, regained over a day.
const config = { capacity: 1_000_000, refillAmount: 1_000_000, refillIntervalMs: 86_400_000 };
const tank = createTank({ config, store: createMemoryStore(), key: 'site' });

const result = await tank.reserve(20_000); // the most that one call can cost
if (result.ok) {
  const cost = 12_500; // what the call actually cost, as the site measured it
  await result.reservation.settle(cost);
}
```

## Why

A free action that costs the operator money needs a budget that refills, and visitors need to see when the action is available again. The tank grants an action only when the balance covers the most that the action can consume, then settles with what it actually consumed. A failure leaves the reservation charged, so it never overspends. [Decision 4 of the design](docs/design.md#decisions-already-taken) compares the tank with the libraries surveyed before it was built.

The package does not have any runtime dependency and uses neither DOM nor Node APIs, so it runs in a browser and in Node alike. On the server, the tank is the authority; in a browser, `projectBalance` projects a snapshot's balance between server responses.

## Contract

- **Units.** Amounts are plain numbers in a unit that the site chooses. Balances are fractional, and the package never rounds them.
- **Refill.** The balance at a time is the stored balance plus `refillAmount` per `refillIntervalMs` since the stored time, capped at `capacity`. A key without stored state has a full balance.
- **Clock.** The pure functions take the time as an argument. `createTank` reads `Date.now` unless it is given `now`. A write never moves the stored time backwards, so instances whose clocks disagree never credit one interval twice.
- **Reserve.** `reserve(amount)` grants a reservation when the balance covers `amount`, and deducts it. A refusal has a `reason`: `insufficient`, with the `shortfall` and the `readyAt` time at which the balance covers the amount, or `contention`, when every compare-and-set attempt lost to a concurrent write. Each result contains a `snapshot`. The site treats a rejection of `reserve`, such as on a store failure, as a refusal.
- **Settle.** A reservation is settled or cancelled once. A settle refunds the reserved amount minus the actual consumption, up to `capacity`, and debits an overage down to `floor`, which defaults to `-capacity`. A reservation that is never settled stays charged at the reserved amount.
- **Store.** A `BalanceStore` provides `read` and `compareAndSet`, and atomicity is its one obligation. `createMemoryStore()` serves tests and single-process servers. An adapter for another store runs the contract suite from `@williamthorsen/tank/testing` in Vitest:

  ```ts
  import { describeStoreContract } from '@williamthorsen/tank/testing';

  describeStoreContract('createRedisStore', () => createRedisStore(freshClient()));
  ```

- **Snapshot.** A `Snapshot` is the serializable view that a site sends to a browser. `peek()`, `settle`, and `cancel` return one, and every reserve result contains one. In the browser, `parseSnapshot` validates one received as JSON and throws `TypeError` on a malformed value.

## Worst-case spend

Over a period `T`, the operator spends at most `capacity + rate × T`, where `rate` is `refillAmount / refillIntervalMs`, plus every overage that a settle reports. With the configuration above, a week costs at most $1 + 7 × $1 = $8.

Limiting overage is the site's job: It reserves the true maximum that an action can consume and caps the action to that maximum, as an LLM call's output limit does. The overage is then zero. The floor limits how long one bad report disables the action, not what the site spends.

## Limits

The design accepts that one visitor can spend the shared balance, that an unsettled reservation costs availability, and that a browser's projection can be wrong between fetches. [Limits that the design accepts](docs/design.md#limits-that-the-design-accepts) states each one.

## Scripts

Workspace scripts (`build`, `check`, `lint`, `test`, `typecheck`) are run with `nmr`, as [Running scripts](../../README.md#running-scripts) in the root README describes. Run `nmr` from this directory to list this package's scripts.
