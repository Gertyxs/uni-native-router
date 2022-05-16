module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    es6: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: ['prettier'],
  rules: {
    'no-console': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-var-requires': 'off'
  }
}
