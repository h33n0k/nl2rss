/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
	overrides: [
		{
			files: ['tests/**/*'],
			env: {
				jest: true
			}
		}
	],
	// settings: {
    // 'import/resolver': {
	// 		alias: {
	// 			map: [
	// 				['@utils', './src/utils'],
	// 				['@templates', './src/templates'],
	// 				['@types', './src/types'],
	// 				['@resolvers', './src/resolvers'],
	// 				['@services', './src/services'],
	// 				['@schemas', './src/schemas'],
	// 				['@root', './'],
	// 				['@', './src']
	// 			],
	// 			extensions: ['.ts', '.tsx', '*.ts', '*.tsx']
	// 		}
    // }
  // },
  parserOptions: {
    sourceType: 'module',
    useJSXTextNode: true,
    project: [path.resolve(__dirname, 'tsconfig.json')],
  },
  rules: {
    'no-underscore-dangle': 0,
    'arrow-body-style': 0,
    'no-unused-expressions': 1,
    'no-plusplus': 0,
    'no-console': 0,
    'func-names': 0,
    'comma-dangle': [ 'error', 'never' ],
    'no-prototype-builtins': 0,
    'prefer-destructuring': 0,
    'no-else-return': 1,
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/explicit-member-accessibility': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-inferrable-types': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-empty-function': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    curly: ['error', 'all'],
    'padding-line-between-statements': [
      'warn',
      {
        blankLine: 'always',
        prev: '*',
        next: 'return', // add blank line *before* all returns (if there are statements before)
      },
      {
        blankLine: 'always',
        prev: '*',
        next: 'if', // add blank line *before* all ifs
      },
      {
        blankLine: 'always',
        prev: 'if',
        next: '*', // add blank line *after* all ifs
      },
      {
        blankLine: 'any',
        prev: 'if',
        next: 'if', // allow blank line between ifs, but not enforce either
      },
      {
        blankLine: 'always',
        prev: '*',
        next: ['function', 'class'], // add blank line *before* all functions and classes
      },
      {
        blankLine: 'always',
        prev: ['function', 'class'],
        next: '*', // add blank line *after* all functions and classes
      },
      {
        blankLine: 'always',
        prev: '*',
        next: 'import', // add blank line *before* all imports
      },
      {
        blankLine: 'always',
        prev: 'import',
        next: '*', // add blank line *after* all imports
      },
      {
        blankLine: 'never',
        prev: 'import',
        next: 'import', // don't allow blank line between imports
      },
    ],
    'eol-last': 'warn',
  },
  env: {
    node: true,
    jest: true,
  },
};

