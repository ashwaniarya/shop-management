import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirrors tsconfig's "@/*" path mapping for runtime imports in tested modules.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {},
});
