const { defaults: tsjPreset } = require('ts-jest/presets')

module.exports = {
	testEnvironment: 'node',
	transform: tsjPreset.transform,
	verbose: true,
	forceExit: true,
	clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}
