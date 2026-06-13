import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@ai-skills/catalog': resolve(here, '../../libs/catalog/src/index.ts'),
      '@ai-skills/install': resolve(here, '../../libs/install/src/index.ts'),
    },
  },
});
