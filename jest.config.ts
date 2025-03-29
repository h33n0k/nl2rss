import { defaults as tsjPreset } from 'ts-jest/presets'
import type { Config } from 'jest'

const config: Config = {
	testEnvironment: 'node',
	transform: tsjPreset.transform,
	verbose: true,
	forceExit: true,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,
	collectCoverage: true,
	cacheDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.ts'],
	coverageThreshold: {
		global: {
			branches: 85,
			functions: 85,
			lines: 85,
			statements: 85
		}
	},
	coverageReporters: ['json-summary', 'lcov']
}

export default config
