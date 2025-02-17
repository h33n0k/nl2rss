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
		languageOptions: {
			globals: {
				jest: true
			}
		}
	}
)
