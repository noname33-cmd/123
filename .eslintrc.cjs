module.exports = {
  root: true, env: {node: true, es2022: true, jest: true},
  parser: '@typescript-eslint/parser', plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['node_modules/', 'dist/', 'coverage/', 'apps/mobile/'],
  overrides: [{files: ['scripts/*.cjs'], rules: {'@typescript-eslint/no-var-requires': 'off'}}],
};
