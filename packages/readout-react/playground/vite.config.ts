import { defineConfig } from 'vite';

// The package's `#src/*` alias is declared in tsconfig `paths`, which Vite resolves only with `tsconfigPaths` on.
export default defineConfig({
  resolve: { tsconfigPaths: true },
});
