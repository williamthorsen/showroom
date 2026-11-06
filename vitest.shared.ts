import type { VitestConfigOptions } from '@williamthorsen/nmr/vitest';

/**
 * Browser defaults that every package's tests run under. A package with its own `vitest.config.ts` keeps them by
 * passing this layer first: `defineVitestConfig(shared, { … })`. A path added here must be absolute, because Vitest
 * resolves it against each project's own root.
 */
export const shared: VitestConfigOptions = {
  project: { environment: 'jsdom' },
};
