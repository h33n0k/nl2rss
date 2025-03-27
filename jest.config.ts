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
			branches: 60,
			functions: 80,
			lines: 70,
			statements: 70
		}
	},
	coverageReporters: ['json-summary', 'text', 'lcov']
}

export default config
