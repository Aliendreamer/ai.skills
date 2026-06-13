import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.nx/**', '**/coverage/**'],
  },
  ...tseslint.configs.recommended,
);
