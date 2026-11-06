<!-- readme-type: monorepo-root -->

# showroom

Open-source packages for browser apps: UI components and the framework-agnostic cores that they present. Each package lives under `packages/` and is run with [`nmr`](https://www.npmjs.com/package/@williamthorsen/nmr).

## What belongs here

`showroom` holds packages consumed by browser apps: UI components and the framework-agnostic cores that they present. Node tools belong in [workshop](https://github.com/williamthorsen/workshop) instead.

A package may include a Node sidecar only when the sidecar has no native dependency and no test that spawns a process. Anything heavier gets a repository of its own.

## Getting started

Prerequisites: The tool versions pinned in `.tool-versions`, and [pnpm](https://pnpm.io/), installed [standalone](https://pnpm.io/installation); the `packageManager` field pins the version that pnpm then activates.

Install dependencies — this has the same effect regardless of where in the project it is run:

```shell
pnpm install
```

Scripts are run with `nmr`, a workspace bin. For the bare `nmr` command to resolve, either:

- Use [direnv](https://direnv.net/) — the repo's `.envrc` adds `node_modules/.bin` to your `PATH`, so `nmr` works from any directory.
- Or prefix commands with `pnpm exec` (for example, `pnpm exec nmr check`), which works without setup.

## Packages

- `_workspace`: scaffold for a new package. To start one from it, follow [Starting a package from the scaffold](docs/new-package.md).
- [`readout`](packages/readout/README.md): the result type, its redacting JSON serializer, DOM embedding, and typed renderers.
- [`readout-journal`](packages/readout-journal/README.md): a journal of domain events derived from state transitions, and its sentence renderers.
- [`readout-react`](packages/readout-react/README.md): React components over both: a copy button, a JSON view, the structured view of a readout, and the journal drawer.

## Running scripts

[`nmr`](https://www.npmjs.com/package/@williamthorsen/nmr) is the script runner. It is **context-aware**: Run from the repo root it uses the root script registry; run from a package directory it uses that package's registry.

Run `nmr` with no command to list every available script — that output is authoritative, so the full set is not duplicated here.

Common commands:

```shell
nmr check      # typecheck, format check, lint check, and tests
nmr typecheck  # type-check only
nmr lint       # lint and apply automatic fixes
nmr lint:check # lint without fixing
nmr test       # run tests
nmr build      # build packages
```

Useful flags:

- `-R`, `--recursive` — run the command in every package
- `-F <pattern>`, `--filter <pattern>` — run the command in matching packages
- `-w`, `--workspace-root` — force the root registry from inside a package directory

Per-package scripts such as `dev`, `preview`, and `start` are not `nmr` commands — they are `package.json` scripts. Run them with `pnpm run <script>` from the package directory.
