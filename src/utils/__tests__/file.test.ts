import fs, { MakeDirectoryOptions, NoParamCallback, PathLike } from 'fs'
import path from 'path'

import { Effect } from 'effect'
import { faker } from '@faker-js/faker'

import * as FileHandler from '../../handlers/file'
import * as FileUtils from '../file'
import { StreamTypeId } from 'effect/Stream'

jest.mock('../logger')
jest.mock('fs')

const mockedDir = '/mocked-directory'
const mockedFile = path.join(mockedDir, 'mocked-file.txt')

describe('utils/file:', () => {
	describe('`checkFile` method:', () => {
		interface Mocks {
			access: jest.SpyInstance
		}

		const defaultMocks = (): Mocks => ({
			access: (fs.access as unknown as jest.SpyInstance).mockImplementation(
				(
					_path: PathLike,
					_mode: number | undefined,
					callback: NoParamCallback
				) => {
					callback(null)
				}
			)
		})

		const tests: {
			description: string
			expectSuccess: boolean
			expectedCode?: string
			file: string
			mocks: () => Mocks
		}[] = [
			{
				description: 'should check file access',
				file: faker.system.filePath(),
				expectSuccess: true,
				mocks: defaultMocks
			},
			{
				description: 'should check directory access',
				file: faker.system.directoryPath(),
				expectSuccess: true,
				mocks: defaultMocks
			}
		]

		const errors = new Map<string, string>()
		errors.set('should handle inexistant file errors', 'ENOENT')
		errors.set('should handle permission errors', 'EACCESS')
		errors.set('should handle file table overflow errors', 'EMFILE')
		errors.set('should handle space issue errors', 'ENOSPC')

		for (const [description, code] of errors.entries()) {
			tests.push({
				description,
				file: faker.system.filePath(),
				expectSuccess: false,
				expectedCode: code,
				mocks: () => {
					const m = defaultMocks()
					m.access = (
						fs.access as unknown as jest.SpyInstance
					).mockImplementation(
						(
							_path: PathLike,
							_mode: number | undefined,
							callback: NoParamCallback
						) => {
							callback(
								Object.assign(new Error('mocked error message'), { code })
							)
						}
					)

					return m
				}
			})
		}

		describe.each(tests)(
			'tests suit:',
			({ description, expectSuccess, expectedCode, file, mocks }) => {
				it(description, async () => {
					// Setup mocks
					mocks()

					await FileUtils.checkFile(file).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeDefined()
									expect(typeof result).toEqual('string')
									expect(result).toEqual(file)
								} else {
									throw new Error('expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									if (expectedCode) {
										expect(error).toBeDefined()
										expect(error).toBeInstanceOf(FileHandler.AccessError)
										expect(error.code).toEqual(expectedCode)
									}
								} else {
									throw error.error
								}
							}
						}),
						Effect.runPromise
					)

					expect(fs.access).toHaveBeenCalledTimes(1)
					expect(fs.access).toHaveBeenCalledWith(
						file,
						expect.any(Number),
						expect.any(Function)
					)
				})
			}
		)
	})

	describe('`makeDir` method:', () => {
		interface Mocks {
			mkdir: jest.SpyInstance
		}

		const defaultMocks = (): Mocks => ({
			mkdir: (fs.mkdir as unknown as jest.SpyInstance).mockImplementation(
				(
					_path: PathLike,
					_options: MakeDirectoryOptions,
					callback: NoParamCallback
				) => {
					callback(null)
				}
			)
		})

		const tests: {
			description: string
			expectSuccess: boolean
			expectedCode?: string
			dir: string
			mocks: () => Mocks
		}[] = [
			{
				description: 'should write directory',
				dir: faker.system.directoryPath(),
				expectSuccess: true,
				mocks: defaultMocks
			}
		]

		const errors = new Map<string, string>()
		errors.set('should handle inexistant directory errors', 'ENOENT')
		errors.set('should handle permission errors', 'EACCESS')
		errors.set('should handle file table overflow errors', 'EMFILE')
		errors.set('should handle space issue errors', 'ENOSPC')

		for (const [description, code] of errors.entries()) {
			tests.push({
				description,
				dir: faker.system.directoryPath(),
				expectSuccess: false,
				expectedCode: code,
				mocks: () => {
					const m = defaultMocks()
					m.mkdir = (
						fs.mkdir as unknown as jest.SpyInstance
					).mockImplementation(
						(
							_path: PathLike,
							_options: MakeDirectoryOptions,
							callback: NoParamCallback
						) => {
							callback(
								Object.assign(new Error('mocked error message'), { code })
							)
						}
					)

					return m
				}
			})
		}

		describe.each(tests)(
			'tests suit:',
			({ description, expectSuccess, expectedCode, dir, mocks }) => {
				it(description, async () => {
					// Setup mocks
					mocks()

					await FileUtils.makeDir(dir).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeDefined()
									expect(typeof result).toEqual('string')
									expect(result).toEqual(dir)
								} else {
									throw new Error('expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									if (expectedCode) {
										expect(error).toBeDefined()
										expect(error).toBeInstanceOf(FileHandler.AccessError)
										expect(error.code).toEqual(expectedCode)
									}
								} else {
									throw error.error
								}
							}
						}),
						Effect.runPromise
					)

					expect(fs.mkdir).toHaveBeenCalledTimes(1)
					expect(fs.mkdir).toHaveBeenCalledWith(
						dir,
						expect.objectContaining({
							recursive: true
						} as MakeDirectoryOptions),
						expect.any(Function)
					)
				})
			}
		)
	})

	describe('`write` method:', () => {
		interface Mocks {
			checkFile: jest.SpyInstance
			makeDir: jest.SpyInstance
			createWriteStream: jest.SpyInstance
		}

		const defaultMocks = (): Mocks => {
			const mockedWriteStream = new (require('stream').Writable)()
			mockedWriteStream._write = jest.fn((_, __, cb) => cb())

			return {
				checkFile: jest
					.spyOn(FileUtils, 'checkFile')
					.mockImplementation((file: string) => Effect.succeed(file)),
				makeDir: jest
					.spyOn(FileUtils, 'makeDir')
					.mockImplementation((file: string) => Effect.succeed(file)),
				createWriteStream: (
					fs.createWriteStream as unknown as jest.SpyInstance
				).mockReturnValue(mockedWriteStream)
			}
		}

		beforeEach(() => {
			jest.restoreAllMocks()
		})

		interface Call {
			spy: keyof Mocks
			times: number
			args?: ('file' | 'parentDir')[][]
		}

		const defaultCalls: Call[] = [
			{
				spy: 'checkFile',
				times: 1,
				args: [['parentDir']]
			},
			{
				spy: 'makeDir',
				times: 0,
				args: [['parentDir']]
			},
			{
				spy: 'createWriteStream',
				times: 1,
				args: [['file']]
			}
		]

		const tests: {
			description: string
			expectSuccess: boolean
			expectedCode?: string
			file: string
			content: string
			mocks: () => Mocks
			calls: Call[]
		}[] = [
			{
				description: 'should write file',
				file: faker.system.filePath(),
				content: faker.lorem.sentence(),
				expectSuccess: true,
				mocks: defaultMocks,
				calls: defaultCalls
			},
			{
				description: 'should make dir if not exists',
				file: faker.system.filePath(),
				content: faker.lorem.sentence(),
				expectSuccess: true,
				mocks: () => {
					const m = defaultMocks()

					m.checkFile = jest
						.spyOn(FileUtils, 'checkFile')
						.mockImplementationOnce((file: string) =>
							Effect.fail(
								new FileHandler.AccessError(
									Object.assign(new Error('mocked error message'), {
										code: 'ENOENT'
									}),
									file,
									'ACCESS'
								)
							)
						)

					return m
				},
				calls: [
					defaultCalls[0],
					{
						spy: 'makeDir',
						times: 1,
						args: defaultCalls[1].args
					},
					defaultCalls[2]
				]
			}
		]

		const errors = new Map<string, string>()
		errors.set('should handle inexistant directory errors', 'ENOENT')
		errors.set('should handle permission errors', 'EACCESS')
		errors.set('should handle file table overflow errors', 'EMFILE')
		errors.set('should handle space issue errors', 'ENOSPC')

		for (const [description, code] of errors.entries()) {
			tests.push({
				description,
				file: faker.system.filePath(),
				content: faker.lorem.sentence(),
				expectSuccess: false,
				expectedCode: code,
				mocks: () => {
					const m = defaultMocks()
					m.createWriteStream = (
						fs.createWriteStream as unknown as jest.SpyInstance
					).mockReturnValue({
						on: jest.fn().mockImplementation((event, callback) => {
							if (event === 'error') {
								callback(
									Object.assign(new Error('mocked error message'), {
										code: code
									})
								)
							}
						}),
						write: jest.fn(),
						end: jest.fn()
					})

					return m
				},
				calls: [
					defaultCalls[0],
					defaultCalls[1],
					{
						...defaultCalls[2],
						times: 0
					}
				]
			})
		}

		describe.each(tests)(
			'tests suit:',
			({
				description,
				expectSuccess,
				expectedCode,
				file,
				content,
				mocks,
				calls
			}) => {
				it(description, async () => {
					// Setup mocks
					const spies = mocks()

					await FileUtils.write(file, content).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeDefined()
									expect(typeof result).toEqual('string')
									expect(result).toEqual(file)
								} else {
									throw new Error('expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									if (expectedCode) {
										expect(error).toBeDefined()
										expect(error).toBeInstanceOf(FileHandler.AccessError)
										expect(error.code).toEqual(expectedCode)
									}
								} else {
									throw error.error
								}
							}
						}),
						Effect.runPromise
					)

					// Assertions
					for (const { spy, times, args } of calls) {
						if (times > 0) {
							const spyInstance = spies[spy as keyof typeof spies]
							expect(spyInstance).toHaveBeenCalledTimes(times)
							if (args && args.length > 0) {
								for (let i = 0; i < times; i++) {
									const v = args[i].map((arg) => {
										switch (true) {
											case arg === 'file':
												return file
											case arg === 'parentDir':
												return path.dirname(file)
										}
									})

									for (let j = 0; j < spyInstance.mock.calls.length; j++) {
										expect(spyInstance.mock.calls[i][j]).toEqual(v[j])
									}
								}
							}
						}
					}
				})
			}
		)
	})

	describe('`read` method:', () => {
		const mockedContent = faker.lorem.sentence()

		interface Mocks {
			createReadStream: jest.SpyInstance
		}

		const defaultMocks = (): Mocks => {
			const mockedReadStream = new (require('stream').Readable)({
				read() {}
			})

			mockedReadStream.push(mockedContent)
			mockedReadStream.push(null)

			return {
				createReadStream: (
					fs.createReadStream as unknown as jest.SpyInstance
				).mockReturnValue(mockedReadStream)
			}
		}

		beforeEach(() => {
			jest.restoreAllMocks()
		})

		interface Call {
			spy: keyof Mocks
			times: number
			args?: 'file'[][]
		}

		const defaultCalls: Call[] = [
			{
				spy: 'createReadStream',
				times: 1,
				args: [['file']]
			}
		]

		const tests: {
			description: string
			expectSuccess: boolean
			expectedCode?: string
			file: string
			mocks: () => Mocks
			calls: Call[]
		}[] = [
			{
				description: 'should read file',
				file: faker.system.filePath(),
				expectSuccess: true,
				mocks: defaultMocks,
				calls: defaultCalls
			}
		]

		const errors = new Map<string, string>()
		errors.set('should handle inexistant directory errors', 'ENOENT')
		errors.set('should handle permission errors', 'EACCESS')
		errors.set('should handle file table overflow errors', 'EMFILE')
		errors.set('should handle space issue errors', 'ENOSPC')

		for (const [description, code] of errors.entries()) {
			tests.push({
				description,
				file: faker.system.filePath(),
				expectSuccess: false,
				expectedCode: code,
				mocks: () => {
					const m = defaultMocks()

					const mockedReadStream = new (require('stream').Readable)({
						read() {}
					})

					mockedReadStream.on = jest
						.fn()
						.mockImplementation((event, callback) => {
							if (event === 'error') {
								callback(
									Object.assign(new Error('mocked error message'), { code })
								)
							}
						})

					mockedReadStream.pipe = jest.fn().mockReturnThis()
					mockedReadStream.destroy = jest.fn()

					m.createReadStream = (
						fs.createReadStream as unknown as jest.SpyInstance
					).mockReturnValue(mockedReadStream)

					return m
				},
				calls: defaultCalls
			})
		}

		describe.each(tests)(
			'tests suit:',
			({ description, expectSuccess, expectedCode, file, mocks, calls }) => {
				it(description, async () => {
					// Setup mocks
					const spies = mocks()

					await FileUtils.read(file).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeDefined()
									expect(typeof result).toEqual('string')
									expect(result).toEqual(mockedContent)
								} else {
									throw new Error('expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									if (expectedCode) {
										expect(error).toBeDefined()
										expect(error).toBeInstanceOf(FileHandler.AccessError)
										expect(error.code).toEqual(expectedCode)
									}
								} else {
									throw error.error
								}
							}
						}),
						Effect.runPromise
					)

					// Assertions
					for (const { spy, times, args } of calls) {
						if (times > 0) {
							const spyInstance = spies[spy as keyof typeof spies]
							expect(spyInstance).toHaveBeenCalledTimes(times)
							if (args && args.length > 0) {
								for (let i = 0; i < times; i++) {
									const v = args[i].map((arg) => {
										switch (true) {
											case arg === 'file':
												return file
										}
									})

									for (let j = 0; j < spyInstance.mock.calls.length; j++) {
										expect(spyInstance.mock.calls[i][j]).toEqual(v[j])
									}
								}
							}
						}
					}
				})
			}
		)
	})
})
