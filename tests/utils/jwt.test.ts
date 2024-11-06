import dotenv from 'dotenv'

dotenv.config()

import { Effect } from 'effect'
import config from 'config'
import fs from 'fs'
import { sign, verify } from '../../src/utils/jwt.util'

jest.mock('../../src/utils/logger.util', () => ({
	main: {
		verbose: jest.fn(),
		info: jest.fn(),
		error: jest.fn()
	}
}))

describe('utils/jwt module', () => {
	it('should uses valid key files', () => {
		expect(fs.existsSync(config.get<string>('jwt.keys.private'))).toBe(true)
		expect(fs.existsSync(config.get<string>('jwt.keys.public'))).toBe(true)
	})

	it('should sign and verify a token', async () => {
		const payload = { key: 'value' }
		const token = await Effect.runPromise(sign(payload))
		expect(token).toBeDefined()
		expect(typeof token).toBe('string')
		expect(token).not.toBe('')
		const result = await Effect.runPromise(verify(token))
		expect(typeof result).toBe('object')
		expect(result).toHaveProperty('key', 'value')
	})
})
