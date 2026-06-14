import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { main: 'src/main.ts' },
  // CJS output so bundled dependencies that use require() work natively
  // (an ESM bundle throws "Dynamic require ... is not supported").
  format: ['cjs'],
  outExtension: () => ({ js: '.cjs' }),
  platform: 'node',
  target: 'node20',
  bundle: true,
  // Bundle everything (workspace libs + third-party) into one self-contained file,
  // so the published package has no runtime dependencies and `npx` is one fast download.
  noExternal: [/.*/],
  clean: true,
  dts: false,
  outDir: 'dist',
});
