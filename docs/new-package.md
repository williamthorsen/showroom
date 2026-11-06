# Starting a package from the scaffold

`packages/_workspace` is the scaffold for a new package. A copy keeps the scaffold's identity until every item below is changed, and nothing checks most of them. The exception is `src/__tests__/template.unit.test.ts`: In a copy, that test fails until the package's `name` and README title both change.

In the steps below, `<template>` is `packages/_workspace` and `<target>` is `packages/<dir>`, where `<dir>` is the new package's directory name.

## Copy the directory

From the repo root, copy the scaffold's committed files into the target:

```shell
mkdir -p <target>
git archive --format=tar HEAD:<template> | tar --extract --directory <target> --exclude CHANGELOG.md
```

`git archive` copies only what the scaffold commits, so gitignored output such as `node_modules/`, `coverage/`, and `dist/` stays behind. `tar` writes into `<target>` whether or not it already exists, so the copy never nests a second directory inside it. The scaffold's `CHANGELOG.md` stays behind too; release-kit writes a new one on the first release.

The directory name is the workspace's scope, whichever directory contains it: Commit titles name it (`<dir>|feat: …`), and so do its `scope:<dir>` label and its entry in `.meta/label-map.json`.

## In the workspace

- **`package.json`:**
  - `name`: release-kit derives the workspace's release tags from it, as `<name>-v<version>`.
  - `description` and `keywords`.
  - `version`: Set it to `0.0.0`. release-kit bumps from this value on the workspace's first release.
- **`README.md`:** Replace the title and the opening sentence.

Then run `pnpm install`, which adds the workspace to `pnpm-lock.yaml`. `pnpm-workspace.yaml` already declares `packages/*`.

## In the repo

### Labels

Each workspace has a `scope:<dir>` label, which pull requests and issues take. Two files that reach GitHub are generated, so add the label to the one authored file and regenerate the others:

1. **Authored:** In `.config/release-kit.config.ts`, add `'scope:<dir>': { color: '00ff96', description: '<dir> package' }` to `repoLabels.labels`.
2. **Generated:** `pnpm exec release-kit sync-labels generate` rewrites `.github/labels.yaml` from that config. `pnpm exec release-kit sync-labels generate --check` fails while the file is stale.
3. **Generated:** `pnpm exec codeassembly generate label-map --force` rewrites `.meta/label-map.json`, taking a scope from each workspace that the `pnpm-workspace.yaml` globs match, named by its directory, plus `root`. Without `--force`, it refuses to replace the existing file.

The labels reach GitHub when the change merges to `main`: `.github/workflows/sync-labels.yaml` applies `.github/labels.yaml`. On the pull request, the workflow's check job logs the label changes that the merge will make. `pnpm exec release-kit sync-labels sync` runs the same workflow by hand.

### Workspace lists

Add the workspace to the list in the root `README.md` ("Packages") and in `AGENTS.md` ("Project structure").

## Check for leftovers

Search the new directory for the scaffold's package name, which appears wherever the copy still identifies as the scaffold:

```shell
git grep --untracked --line-number 'showroom-workspace-template' -- '<target>'
```

A match in `src/__tests__/template.unit.test.ts` is expected, because that test compares the package's `name` against the scaffold's.
