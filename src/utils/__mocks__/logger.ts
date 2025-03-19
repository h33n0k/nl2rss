const logger = {
	info: jest.fn(),
	http: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	silly: jest.fn(),
	verbose: jest.fn()
}

export default logger
