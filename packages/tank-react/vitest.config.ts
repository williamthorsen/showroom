import { defineVitestConfig } from '@williamthorsen/nmr/vitest';

import { shared } from '../../vitest.shared.ts';

// The `#src/*` alias is declared in tsconfig `paths`, which Vitest resolves only with `tsconfigPaths` on.
export default defineVitestConfig(shared, { tsconfigPaths: true });
