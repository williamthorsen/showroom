# Changelog

All notable changes to this project will be documented in this file.

## 0.9.0 — 2026-11-26

### 🎉 Features

- Adds a visible header to `TankMeter` that shows the label and the current value, such as "62%", with new `icon` and `description` props, the description also becoming the meter's accessible description. (#46)
- 🚨 **Breaking:** Replaces `TankMeter`'s unlabelled mark at the `required` amount with a hatched segment as wide as `required`, which moves with the fill and which a legend under the bar names ("Needs 40%" by default, written by the new `formatRequired` prop). (#46)
- Adds the visible value to the result of `useTankMeter` as `valueLabel`, written by a new `formatValue` option, and exports `formatDefaultValue`, `formatDefaultRequired`, and the `TankMeterValueInput` type so that a custom formatter can fall back to the defaults. (#46)
- 🚨 **Breaking:** Replaces the `action` prop of `Tour` with an optional `action` field on `TourStep`, a `TourAction` of `{ label, href?, onSelect? }` that the tour renders at the end of that step's slide as a button styled like its own, or as a link when `href` is set. (#47)
- Hides the disabled Previous button on the first step instead of drawing it with a dashed border, and keeps its space so that Next stays in the same place from step to step. (#47)

### 🐛 Bug fixes

- Fixes the issue that the meter's default percentage text wrote some values one point low, such as 28% for a fraction of 0.29. (#46)
- Fixes the issue that the "×" character in the round close button was off centre, and draws the X as an SVG icon that stays centred in any font. (#47)

## 0.8.0 — 2026-11-23

### 🎉 Features

- Lets `useTank` accept an undefined `required` amount, for which it reports `loading` and then projects the snapshot that it already fetched once the amount is defined, without fetching again. (#43)

## 0.7.0 — 2026-11-22

### 🎉 Features

- Adds `TankMeter`, a bar with the `meter` role that fills toward a full tank in one CSS animation and marks the `required` amount, and `TankCountdown`, which writes text such as "Ready in 3:42". (#41)
- Adds the stylesheet `@williamthorsen/tank-react/styles.css`, which styles both components and declares each colour, size, and radius as a `--tank-*` custom property that a theme overrides. (#41)
- Adds `useTankMeter`, which returns the meter's ARIA props, the live-region announcement, and the fill-animation description from which a meter of another form, such as a ring, is built, and `formatCountdown`, which writes the countdown text for a custom component. (#41)
- Adds `snapshot`, the applied snapshot as the server sent it, and `required`, the option that the hook was given, to the result of `useTank`. (#41)

### ⚙️ Tooling

- Adds a Vite playground, served by `pnpm run dev` in `packages/tank-react`, that demonstrates `TankMeter`, `TankCountdown`, and a ring built from `useTankMeter` over the in-memory store. (#41)

## 0.6.0 — 2026-11-22

### 🎉 Features

- Adds the `useTank` hook to `@williamthorsen/tank-react`, which reports a tank's status, balance, and ready time for a required amount by projecting the latest server snapshot locally, and fetches a new snapshot on mount, when the tab becomes visible, and shortly after the projected ready time. (#40)

### 🏗️ Internal features

- Adds `packages/tank-react`, a private `@williamthorsen/tank-react` workspace copied from the scaffold, which does not contain any code yet, and registers its `scope:tank-react` label and its entries in the root `README.md` and `AGENTS.md`. (#38)

### 📚 Documentation

- Excludes `.meta` from the copy step in `docs/new-package.md`, because the scaffold's `.meta/changelog.json` records the scaffold's own releases. (#38)

## 0.5.0 — 2026-11-22

### 🎉 Features

- Adds `createTank`, whose `reserve` grants a reservation only when the balance covers the requested amount and whose `settle` refunds the unused part up to `capacity` or debits an overage down to `floor`, which defaults to `-capacity`, against a `BalanceStore` that provides `read` and an atomic `compareAndSet`. (#37)
- Exports the pure balance functions `projectBalance`, `computeReadyAt`, `applyReserve`, and `applySettle`, together with `parseSnapshot`, which validates a `Snapshot` received as JSON, so that a browser can project the balance between server responses. (#37)
- Adds `createMemoryStore`, an in-memory `BalanceStore` for tests and single-process servers. (#37)
- Adds `describeStoreContract` at the `@williamthorsen/tank/testing` entry point, which registers a Vitest suite that checks a `BalanceStore` adapter against the store contract, including that exactly one of two concurrent writes succeeds. (#37)

### 🏗️ Internal features

- Adds `@williamthorsen/tank` as a private package that does not contain any code yet, copied from the `_workspace` scaffold and listed in `README.md` and `AGENTS.md`. (#36)

### ⚙️ Tooling

- Adds the `scope:tank` label to `.config/release-kit.config.ts` and to the generated `.github/labels.yaml` and `.meta/label-map.json`. (#36)

### 📚 Documentation

- Adds `packages/tank/docs/design.md`, which specifies a token bucket shared by the whole site, in which the site reserves the most that a call might consume and then settles with the actual consumption, along with a replaceable store and a React package, `@williamthorsen/tank-react`, that displays the balance. (#36)

## 0.4.0 — 2026-11-20

### 🎉 Features

- Start-aligns the eyebrow, title, and lead of each slide, which were centered, so that they share an edge with the slide's bulleted points. (#30)
- Aligns the first step dot in the dialog's footer with the start edge of the slide content, at every viewport width. (#30)

### 🐛 Bug fixes

- Fixes the issue that the tour dialog rendered in the top-left corner of the viewport, rather than centred, on a page whose stylesheet resets `margin`, such as one using Tailwind's preflight. (#29)
- Fixes the issue that the points on a tour slide lost their bullets on a page whose stylesheet resets `list-style`, such as one using Tailwind's preflight. (#29)

## 0.3.0 — 2026-11-15

### 🎉 Features

- 🚨 **Breaking:** Replaces `JournalDrawer`'s modal `<dialog>` with a non-modal dock that overlays the page from the bottom edge or, with `side="right"`, the right edge, renders its own toggle, can be resized by drag or arrow keys through a separator, and reports its size through `onSizeChange` so that an app can keep the size across reloads by passing it back as `defaultSize`. (#18)
- Colours `CopyButton`'s copied and failed states with the new `--readout-success` and `--readout-danger` custom properties, which have light and dark values. (#18)
- Adds the `Tour` component, which shows each `TourStep` in a fixed-size modal dialog with progress dots, Previous and Next buttons, arrow-key navigation, a built-in `flow`, `grid`, or `scatter` visual of icon tiles or a custom React element, and an optional call to action on the last step. (#20)
- Adds the `useFirstRunTour` hook, which opens a tour on the first visit for a storage key, records in `localStorage` that the tour was seen when it closes, and returns props that spread into `Tour`. (#20)
- Adds `@williamthorsen/tour-react/styles.css`, which themes the tour through `--tour-` custom properties and contains a dark set under `prefers-color-scheme: dark`. (#20)

### ⚙️ Tooling

- Adds a playground to `packages/tour-react`, started by `pnpm run dev`, whose controls reopen the tour and reset the first-run marker. (#20)
- Raises the Node.js version in `.tool-versions` from 24.22.3 to 26.13.1 and leaves every `engines` field unchanged, so the published packages still support Node 24. (#23)
- Adds `.meta/changelog-overrides.json`, which excludes the unreleased "Require Node 26" commit from the generated changelogs. (#26)

### 👷 CI

- Adds a `code-quality-node-24` job to `.github/workflows/code-quality.yaml`, which runs the `build` and `test` checks on Node 24 to verify the packages against their `engines.node` floor. (#26)

### 📦 Dependencies

- Sets `engines.node` back to `>=24` in every package and to `>=24.16.0` at the root, reversing the unreleased raise to `>=26`, and pins `@types/node` to 24.19.2 in the catalog to match. (#26)

## 0.2.0 — 2026-11-07

### 🎉 Features

- Adds the `Terminal` component, which renders a server's output with xterm.js, sends keystrokes back, refits its grid whenever its container changes size, and connects either through a WebSocket that it opens at `url` and closes on unmount or through a `transport` owned by the consumer. (#15)
- Adds `createWebSocketTransport`, the transport behind `url`, which sends terminal bytes as binary WebSocket frames and the grid's size as a JSON `resize` text frame, and the `TerminalTransport` interface, through which a consumer connects a `Terminal` to a channel of its own. (#15)
- Adds `@williamthorsen/terminal-react/styles.css`, which imports xterm's stylesheet, sizes the component to its parent, and draws a focus ring whose colour the custom property `--terminal-react-focus` sets. (#15)
- Adds a keyboard escape from the focus of `Terminal`, in which Escape followed by Tab or Shift+Tab moves focus to the next or the previous focusable element while Escape itself still reaches the process, and states the escape as the accessible description of the terminal's input. (#16)

### 🏗️ Internal features

- Adds the initial `@williamthorsen/terminal-react` workspace, with a manifest that declares `@xterm/xterm` 6.0.0, `@xterm/addon-fit` 0.11.0, a React 19 peer dependency, and a `./styles.css` export, and registers the package in the README, `AGENTS.md`, the release-kit config, and the `scope:terminal-react` label. (#14)

### ⚙️ Tooling

- Adds a playground that renders the `Terminal` in a resizable frame with a theme toggle and connects it to an echo WebSocket server, served by the playground's Vite config, that speaks the wire protocol. (#15)

## 0.1.0 — 2026-11-06

### 🎉 Features

- Adds the `@williamthorsen/readout` package, whose `Readout` type pairs a result's data with a list of its sensitive top-level fields, and whose `serializeReadout` and `redactReadout` leave those fields out and name them under `redacted` unless the caller passes `includeSensitive: true`. (#8)
- Adds `embedJson`, which escapes every `<` in JSON text so that the text can be the content of a `<script type="application/json">` element without closing the element or opening a comment. (#8)
- Adds the `Renderers` type, which maps each type of value to its renderer and fails the typecheck when a type lacks one, and the `render` function, which dispatches a value to the renderer for its `type`. (#8)
- Adds the `@williamthorsen/readout-journal` package, whose `withJournal` wraps a reducer so that each transition appends to the journal the domain events that a derivation function finds in the state before, the action, and the state after, and whose `serializeJournal` returns the journal as JSON. (#9)
- Adds `EntryRenderers` and `renderEntry`, which render each journal entry through the renderer declared for its event type, so that the typecheck reports an event type that lacks a renderer. (#9)
- Adds `CopyButton`, which copies a text and reports the result in its label and to a screen reader, `JsonView`, which shows JSON in a scrollable region that a keyboard user can focus, and `EmbeddedJson`, which embeds JSON in a `<script type="application/json">` element for a driven browser to read. (#11)
- Adds `ReadoutView`, which shows a readout on a Details tab and its JSON on a Data tab and always embeds that JSON without the sensitive fields, and `ReadoutPanel`, the Data tab's content on its own, which includes the sensitive fields only after the person turns on "Include sensitive fields". (#11)
- Adds `useJournal`, a hook that holds a state under a reducer and journals each transition, and `JournalDrawer`, a modal dialog that lists the journal's entries newest first and shows the journal as JSON with Copy JSON. (#11)
- Adds `@williamthorsen/readout-react/styles.css`, the stylesheet imported by a consumer to style every component, which declares each colour as a `--readout-` custom property with a dark set so that an app can override the properties to theme the components. (#11)

### 🏗️ Internal features

- Removes the template's starter apps under `apps/`, its readyup drift kit and `drift:sweep` script, its migration guides, and their `scope:*` labels, and renames the root package and the `_workspace` scaffold to the `showroom` identity. (#7)
- Licenses the repository and the `_workspace` scaffold under ISC and adds a root `LICENSE` file. (#7)

### ⚙️ Tooling

- Sets browser defaults for every package by adding the DOM libraries and `jsx: react-jsx` to the root `tsconfig.json` and adding a `vitest.shared.ts` layer that makes `jsdom` the default test environment, which a package with its own Vitest config keeps by passing the layer to `defineVitestConfig`. (#7)
- Passes `-r` to `xargs` in `nmr lint:shell` so that GNU xargs skips `shellcheck` when the repository does not track any `*.sh` file, rather than running it without arguments and failing the CI shell job. (#7)
- Adds a `typecheck:post` script that typechecks the published source of `packages/readout` through `tsconfig.src.json`, which excludes the tests, so that the DOM lib loaded by a test's `/// <reference lib="dom" />` cannot hide a DOM API used in `src/`. (#8)

### 👷 CI

- Adds `.github/workflows/publish.yaml`, which publishes a workspace to npm through trusted publishing, with provenance, when the release workflow pushes the workspace's `<dir>-v<version>` tag. (#8)

### 🤖 Agentic support

- Removes the one-time `initialize-node-monorepo` skill, which the repository no longer needs after its initialization. (#7)
- Records in `AGENTS.md` the plain-CSS style policy, the shared Vitest layer with its `jsdom` default, and the browser defaults that the root `tsconfig.json` sets, and points to the README's boundary section. (#7)
- Documents in `AGENTS.md` that Vite and Vitest resolve a compiled library's `#src/*` alias, declared in tsconfig `paths`, only with `tsconfigPaths` on. (#11)

### 📚 Documentation

- Adds a "What belongs here" section to `README.md`, which restricts the repository to packages for browser apps and allows a package to include a Node sidecar only if the sidecar does not depend on a native module and its tests do not spawn a process. (#7)
- Changes the scope-label step in `docs/new-package.md` to add the label without a `description`, which release-kit's readyup kit reports. (#8)

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
