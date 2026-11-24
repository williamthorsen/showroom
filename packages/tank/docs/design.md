# Tank: design

## Purpose

A site offers its visitors an action that costs the operator something, such as an LLM call, at no cost to the visitor. The operator's spend stays bounded because the action draws on a balance that regenerates at a configured rate. Visitors see the balance and watch it recharge.

The first consumer is the Prompt Visualizer app in `williamthorsen/codeassembly-studio`, which would offer a complimentary prompt conversion.

## Non-goals

- Anything specific to LLMs. The packages track the availability, expenditure, and regeneration of a number. The site makes its own call and reports what the call consumed.
- A balance per visitor. Every operation takes a key so that a later change can add one (see "Extension to per-visitor balances").
- HTTP routes, authentication, bot protection, or visitor identity. These belong to each site.
- Queuing or waiting for capacity. The tank refuses a call that the balance cannot cover, and returns the time at which the balance will cover it.

## Decisions already taken

1. One balance is shared by the whole site.
2. The site reserves the maximum that a call might consume, then settles with the actual consumption. "The balance must be full" is the case in which the reserved amount equals the capacity.
3. The packages gate and meter only.
4. Build rather than adopt. The design session surveyed five libraries from their READMEs: `@convex-dev/rate-limiter`, `throttlekit`, `@upstash/ratelimit`, `rate-limiter-flexible`, and `token-bucket-rate-limiter`. The Convex component is closest in design but requires a Convex backend, and each of the five lacks at least one of settle-after-use, replaceable storage, and display components.
5. The Redis-compatible store adapter, `@williamthorsen/tank-redis` (williamthorsen/workshop#999), lives in [workshop](https://github.com/williamthorsen/workshop), not here: Only a test against a running Redis shows that the adapter is atomic, and [What belongs here](../../../README.md#what-belongs-here) excludes a package with such a test from this repository.

## Limits that the design accepts

- One visitor, or a bot, can spend the shared balance repeatedly and thereby deny the action to everyone else. The operator's spend stays bounded, which is the purpose. A site that needs fairness adds its own protection, or waits for per-visitor balances.
- A reservation that the site never settles costs availability: The balance stays charged at the reserved amount although the action consumed less. It does not cost the operator money.
- The browser's projection can be wrong in either direction between fetches, because other visitors spend the balance. The server's answer to `reserve` is the only authority.
- The browser's clock offset has an error of up to one network round trip.

## Model

The model is a token bucket with continuous refill.

Configuration:

- `capacity`: the maximum balance.
- `refillAmount` per `refillIntervalMs`: the regeneration rate.
- `floor`: the lowest balance that the ledger records after an overage. The default is `-capacity`. The floor limits how long one bad report can disable the action. It does not limit spend: The site still spends an overage below the floor, and the ledger does not record it.

State, per key: `{ balance, updatedAt }`, where `updatedAt` is epoch milliseconds on the server's clock. The tank writes the state only when an operation changes it. `projectBalance` computes the balance at any later time:

```
balanceAt(now) = min(capacity, balance + rate × max(0, now − updatedAt))
```

Every write sets `updatedAt = max(stored updatedAt, now)`. Server instances disagree slightly about the time, and a write that moved `updatedAt` backwards would let the next instance credit the same interval twice.

A key without stored state has a full balance. The state of a site-wide balance does not need an expiry, because it occupies a single key.

The operator's worst-case spend over a period `T` is `capacity + rate × T`, plus the sum of every overage. Limiting overage is the site's job: It reserves a true maximum and caps its action to that maximum, in which case the overage is zero. This bound is the property that the packages exist to provide, and the package README will state it with a worked example.

Units are plain numbers, and balances are fractional: The core never rounds, and only the display does. The site decides what one unit means. For LLM calls, the design recommends a cost unit (such as micro-dollars) over a raw token count, because providers price input and output tokens differently.

## Core package: `@williamthorsen/tank`

The core is framework-agnostic and dependency-free, and it runs on a server and in a browser.

### Pure functions

Every function takes `now` as an argument. The core never reads a clock.

- `projectBalance(state, config, now)` returns the balance at `now`.
- `computeReadyAt(state, config, amount, now)` returns the time at which the balance covers `amount`.
- `applyReserve(state, config, amount, now)` returns either the next state, or a refusal that contains the shortfall and `readyAt`.
- `applySettle(state, config, reserved, actual, now)` returns the next state. It refunds `reserved − actual`, capped at `capacity`. When `actual` exceeds `reserved`, it debits the difference, down to `floor`.

### Storage contract

```ts
interface BalanceStore {
  read(key: string): Promise<Versioned<BalanceState> | undefined>;
  compareAndSet(key: string, expected: Version | undefined, next: BalanceState): Promise<boolean>;
}
```

The tank runs each operation as read, compute, compare-and-set, and retries when the compare fails. Atomicity is therefore the store's one obligation, each adapter is small, and the arithmetic stays in the pure functions rather than in an adapter's script.

- An `expected` of `undefined` means "set only if the key is absent".
- `Version` is opaque to the tank. An adapter chooses a counter or a hash of the state.
- The tank retries up to `maxAttempts` times, 5 by default. When the tank exhausts its attempts, `reserve` returns a refusal and `settle` rejects.

The core exports `createMemoryStore()`, for tests, playgrounds, and single-process servers.

### Tank

```ts
const tank = createTank({ config, store, key, now });

await tank.peek();              // Snapshot
const result = await tank.reserve(amount);
if (result.ok) {
  // ... the site performs its action ...
  await result.reservation.settle(actualAmount);   // or .cancel()
} else {
  // result.snapshot, result.readyAt
}
```

- A reservation is a value held by the caller. The store does not track open reservations, so the stored state stays `{ balance, updatedAt }`.
- `settle` and `cancel` act once. A second call on the same reservation throws.
- A reservation that the site never settles stays charged at the reserved amount. A crashed or terminated call therefore never overspends.
- `reserve` rejects when the store fails. The site must treat a rejection as a refusal.

### Snapshot

`Snapshot` is the serializable view that a site sends to the browser:

```ts
interface Snapshot {
  balance: number;
  capacity: number;
  refillAmount: number;
  refillIntervalMs: number;
  asOf: number;       // server clock, epoch ms
}
```

The server decides the amount that an action reserves and never accepts one from the browser. The site's endpoint returns that amount beside the snapshot, so that the display cannot drift from what the server will reserve.

The core exports `parseSnapshot`, which validates an unknown value. The browser computes its clock offset when a snapshot arrives and projects the balance locally with `projectBalance`, the same function that the server uses.

## Store adapter

A serverless consumer needs a shared store. The adapter for Redis-compatible stores is `@williamthorsen/tank-redis`, a package in `workshop` (decision 5). It implements `compareAndSet` as one Lua script, because a `WATCH` transaction does not work over a stateless HTTP client, and its tests run the script against a real Redis. The core exports the store-contract test suite at `@williamthorsen/tank/testing`, which the adapter runs.

## React package: `@williamthorsen/tank-react`

### Hook

```ts
const tank = useTank({ fetchSnapshot, required, refreshIntervalMs });
// tank.status: 'loading' | 'ready' | 'recharging' | 'error'
// tank.balance, tank.fraction, tank.readyAt, tank.msUntilReady, tank.error
// tank.revision, tank.projectAt(time), tank.snapshot, tank.required
// tank.refresh(), tank.applySnapshot(snapshot)
```

- `fetchSnapshot` is the site's function, and it receives an `AbortSignal`. The package does not know the transport, so the site validates the response with `parseSnapshot`.
- `required` is the amount that the next action reserves, as the site's endpoint reported it. `ready` means that the projected balance covers it. An invalid `required`, such as one above the capacity, is reported as the `error` status rather than thrown.
- The balance is shared, so another visitor can spend it at any time. The hook refetches on mount, when the tab becomes visible, at the projected `readyAt` plus a random delay of up to 3 seconds, and every `refreshIntervalMs` while the tab is visible. The random delay keeps every open tab from calling the endpoint at the same instant. The site calls `applySnapshot` with the snapshot that its own action returns, including a refusal's. The snapshot with the latest `asOf` wins.
- A failed fetch sets `error` and keeps projecting the last snapshot, so that the meter does not blank.
- `revision` increments whenever the projection restarts: on a snapshot, on a change of `required`, and when the tab becomes visible. With `projectAt`, it lets the meter restart its animation without the hook knowing about CSS.
- The server's `reserve` is the authority. The site's UI must handle a refusal that arrives while the meter shows `ready`.
- `snapshot` is the applied snapshot and `required` is the option, so that the meter reads the capacity, the refill rate, and the reservation segment's size from the result rather than taking them again.

### Meter and countdown

A site can represent the balance in many forms, such as a bar, a ring, a battery, or segmented pips, so the package follows the headless-plus-default model of React Aria's `useMeter` and `Meter`: a hook that holds every decision that does not depend on the form, and default components over it.

- `useTankMeter(tank, { label, formatValue, formatValueText, readyText })` returns the props of an element with `role="meter"`, which follows the WAI-ARIA meter pattern; the visible value, `valueLabel`; the props and text of a polite live region; and an animation description: a key that changes at each `revision`, the start fraction, the end fraction (full, unless the fill does not move), the delay, the duration, and the live fraction.
- `TankMeter` is the default bar over the hook. Following React Aria's `Meter`, it shows its label and value, with an optional icon and a one-line description, above the bar and inside the meter element, whose children are presentational. A hatched segment as wide as the `required` fraction, when it is below capacity, sits at the end of the fill while the balance covers it and at the start of the track while it does not, and a legend names it. The segment shows both what the next action needs and the most that it can deduct. It does not use a native `<meter>`, whose fill cannot be animated or styled consistently across browser engines.
- `TankCountdown` and `formatCountdown` write the time until ready, including the time to repay a negative balance.
- `aria-valuetext`, such as "62% full, ready in about 4 minutes", comes from a sample that is replaced on every snapshot and status change, which are discrete events, and otherwise once a minute, so that it never describes a balance from before a spend or contradicts the status. The live region announces only the change from recharging to ready, and not a tank that is ready on load.
- The text is English by default, and the formatters replace it. The default text states a percentage and a time: The site defines the units, such as micro-dollars, and a visitor cannot read them. A site whose units a visitor can read writes an amount through `formatValue` and `formatRequired`.

### Styles and theming

The package ships its styles as a plain CSS file that the consumer imports, as [Code style](../../../AGENTS.md#code-style) in `AGENTS.md` requires. Every colour, size, and radius is a custom property with a default, so a theme is a block of property overrides.

The fill animates linearly from the projected fraction to a full tank over the time until full, because the balance keeps regenerating past ready. A negative balance holds the fill at empty, through the animation's delay, until the balance reaches zero. `TankMeter` runs CSS keyframe animations, one for the fill and one for the reservation segment, which holds at the `required` fraction until the fill reaches it, so that the component does not render on every frame. It remounts the animated elements on the animation key, which restarts the animations from the projected value on every snapshot, on a change of `required`, and when the tab becomes visible. The countdown text updates once per second. Under `prefers-reduced-motion`, the fill and the segment do not animate and move once per second with the countdown.

A playground, as in `readout-react` and `tour-react`, demonstrates the components over the memory store with a simulated action, and renders a ring from `useTankMeter` alone.

## Extension to per-visitor balances

Every store operation and every tank takes a `key`. A site-wide balance uses one constant key. A later change that adds per-visitor balances supplies a key per visitor and adds state expiry to the store contract. The core's functions and the components do not change.

## Testing

- Core: unit tests of the pure functions with explicit `now` values, including refill capping, a refusal's `readyAt`, overage to the floor, and a clock that moves backwards. A property test interleaves reserves and settles at arbitrary times and asserts that the balance never exceeds `capacity`, never falls below `floor`, and never credits an interval twice.
- Tank: exhausted retries, and concurrent reservations against the memory store, of which the tank must grant only those that the balance covers.
- Store contract: one shared suite, exported by the core, that every adapter runs.
- React: the hook under fake timers, and the components' roles and text.

## First consumer

The deployed Prompt Visualizer is a static build on Vercel without a server, and its design doc lists operator-paid conversion as a non-goal (williamthorsen/codeassembly-studio#16). A complimentary conversion therefore requires four changes in that repository:

- a server function that holds the operator's API key, reserves, calls the provider, and settles;
- a shared store for the balance;
- a revision of the non-goal and of the Content Security Policy's `connect-src`;
- the meter in the conversion pane.

The function must not be a general proxy to the provider on the operator's key. It accepts only a prompt to convert, runs only the conversion job, uses a model from a fixed list, and caps the output so that the call cannot consume more than it reserved.

That work is one ticket in `williamthorsen/codeassembly-studio`, blocked by the packages' first release and by the adapter's.
