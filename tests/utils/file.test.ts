import dotenv from 'dotenv'

dotenv.config()

import { Effect } from 'effect'
import fs from 'fs'
import * as file from '../../src/utils/file.util'
import { FileHandler } from '../../src/handlers'
import { mock } from 'node:test'

jest.mock('fs')
jest.mock('path')
jest.mock('../../src/utils/logger.util', () => ({
	main: {
		verbose: jest.fn(),
		info: jest.fn(),
		error: jest.fn()
	}
}))

describe('utils/file module', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('exists method', () => {
		it('should return element if exists', async () => {
			const f = 'test-file.txt'
			;(fs.existsSync as jest.Mock).mockReturnValue(true)
			const result = await Effect.runPromise(file.exists(f))
			expect(result).toBe(f)
			expect(fs.existsSync).toHaveBeenCalledWith(f)
		})

		it('should return an error if element does not exist', async () => {
			const f = 'test-file.txt'
			;(fs.existsSync as jest.Mock).mockReturnValue(false)
			await expect(Effect.runPromise(file.exists(f))).rejects.toThrow(`Not Found. ${f}`)
			expect(fs.existsSync).toHaveBeenCalledWith(f)
		})
	})

	describe('getStats method', () => {
		it('should retrieve file stats', async () => {
			const f = 'test-file.txt'
			const stats = { mtime: 3000 }
			;(fs.existsSync as jest.Mock).mockReturnValue(true)
			;(fs.statSync as jest.Mock).mockReturnValue(stats)
			const result = await Effect.runPromise(file.getStats(f))
			expect(result).toBe(stats)
		})
	})

	describe('checkDir method', () => {
		it('should create directory if it does not exits', async () => {
			const dir = 'test-dir'
			;(fs.existsSync as jest.Mock).mockReturnValue(false)
			;(fs.mkdir as unknown as jest.Mock).mockImplementation((_, __, callback) => callback(null))
			const result = await Effect.runPromise(file.checkDir(dir))
			expect(result).toBe(dir)
			expect(fs.existsSync).toHaveBeenCalledWith(dir)
			expect(fs.mkdir).toHaveBeenCalledWith(dir, { recursive: true }, expect.any(Function))
		})
	})

	describe('write method', () => {
		it('should write content to file successfuly', async () => {
			const f = 'test-file.txt'
			const content = 'File content'
			const mockedWriteStream = new (require('stream').Writable)()
			mockedWriteStream._write = jest.fn((_, __, callback) => callback())
			;(fs.createWriteStream as jest.Mock).mockReturnValue(mockedWriteStream)
			;(fs.existsSync as jest.Mock).mockReturnValue(true)
			;(fs.utimesSync as jest.Mock).mockReturnValue(undefined)

			const result = await Effect.runPromise(file.write(f, content))
			expect(result).toBe(f)
			expect(fs.createWriteStream).toHaveBeenCalledWith(f)
		})
	})

	describe('read method', () => {
		it('should read file content successfully', async () => {
			const f = 'test-file.txt'
			const fContent = 'File Content'
			const mockedReadStream = new (require('stream').Readable)()
			mockedReadStream._read = () => {}
			;(fs.existsSync as jest.Mock).mockReturnValue(true)
			;(fs.mkdir as unknown as jest.Mock).mockImplementation((_, __, callback) => callback(null))
			;(fs.createReadStream as jest.Mock).mockReturnValue(mockedReadStream)
			setTimeout(() => {
				mockedReadStream.emit('data', fContent)
				mockedReadStream.emit('end')
			}, 0)

			const result = await Effect.runPromise(file.read(f))
			expect(result).toBe(fContent)
			expect(fs.createReadStream).toHaveBeenCalledWith(f)
		})
	})
})
