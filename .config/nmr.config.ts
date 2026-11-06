import { defineConfig } from '@williamthorsen/nmr/config';

/** Repo-specific script additions. */
export default defineConfig({
  rootScripts: {
    // `-r` skips shellcheck when no `*.sh` file is tracked; GNU xargs otherwise runs it without arguments, and it
    // fails. macOS xargs lacks the long form `--no-run-if-empty`.
    'lint:shell': "git ls-files -z '*.sh' | xargs -0 -r shellcheck",
  },
});
