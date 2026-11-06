import { defineConfig } from '@williamthorsen/nmr/config';

/** Repo-specific script additions. */
export default defineConfig({
  rootScripts: {
    'lint:shell': "git ls-files -z '*.sh' | xargs -0 shellcheck",
  },
});
