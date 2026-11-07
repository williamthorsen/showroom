# Changelog

All notable changes to this project will be documented in this file.

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
