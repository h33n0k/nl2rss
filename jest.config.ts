import { defaults as tsjPreset } from 'ts-jest/presets'
import type { Config } from 'jest'

const config: Config = {
	testEnvironment: 'node',
	transform: tsjPreset.transform,
	verbose: true,
	forceExit: true,
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true
}

export default config
