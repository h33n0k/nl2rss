import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-config-prettier'

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommended,
	tseslint.configs.strict,
	tseslint.configs.stylistic,
	prettierRecommended,
	{
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'off'
		}
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-extraneous-class': 'off'
		},
		languageOptions: {
			globals: {
				jest: true
			}
		}
	}
)
