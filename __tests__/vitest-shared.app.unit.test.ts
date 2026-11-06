import { defineVitestConfig } from '@williamthorsen/nmr/vitest';
import { describe, expect, it } from 'vitest';

import { shared } from '../vitest.shared.ts';

describe('shared Vitest layer', () => {
  it('gives every tier project of a package config the jsdom environment', () => {
    const config = defineVitestConfig(shared, { project: { setupFiles: [] } });
    const projects = config.test?.projects ?? [];

    expect(projects).toHaveLength(4);
    for (const project of projects) {
      expect(project).toMatchObject({ test: { environment: 'jsdom' } });
    }
  });
});
