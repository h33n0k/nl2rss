import path from 'path'

import config from 'config'
import { Effect } from 'effect'
import { Sequelize } from 'sequelize-typescript'
import {
	ValidationError,
	TimeoutError,
	ConnectionRefusedError,
	AccessDeniedError
} from 'sequelize'

import * as DatabaseUtils from '../database'
import * as DatabaseHandler from '../../handlers/database'
import * as FileUtils from '../file'
import * as FileHandler from '../../handlers/file'

jest.mock('sequelize-typescript')
jest.mock('../logger')
jest.mock('../file')
jest.mock('../../models/mail', () => ({
	__esModule: true,
	default: class MockMailModel {}
}))

describe('utils/database', () => {
	const storageDir = config.get<string>('data.path')
	const storageFile = path.join(storageDir, 'nl2rss.sqlite')

	let mockedSequelize: jest.Mocked<Sequelize>

	beforeEach(() => {
		mockedSequelize = jest.createMockFromModule('sequelize-typescript')
		Object.assign(mockedSequelize, {
			authenticate: jest.fn().mockResolvedValue(undefined),
			sync: jest.fn().mockResolvedValue(undefined),
			addModels: jest.fn()
		})
	})

	const defaultMocks = () => ({
		checkFile: jest
			.spyOn(FileUtils, 'checkFile')
			.mockImplementation((file: string) => Effect.succeed(file)),
		makeDir: jest
			.spyOn(FileUtils, 'makeDir')
			.mockImplementation((dir: string) => Effect.succeed(dir)),
		auth: jest
			.spyOn(DatabaseUtils, 'auth')
			.mockImplementation(() => Effect.succeed(mockedSequelize)),
		sync: jest
			.spyOn(DatabaseUtils, 'sync')
			.mockImplementation(() => Effect.succeed(mockedSequelize)),
		addModels: jest
			.spyOn(DatabaseUtils, 'addModels')
			.mockImplementation(() => Effect.succeed(undefined))
	})

	const sequelizeMocks = () => ({
		sequelize: mockedSequelize,
		authenticate: mockedSequelize.authenticate,
		sync: mockedSequelize.sync
	})

	const authTests = [
		{
			description: 'should authenticate to the database',
			expectSuccess: true,
			mocks: sequelizeMocks,
			call: {
				spy: 'authenticate',
				times: 1,
				error: null,
				args: [[]]
			}
		}
	]

	const syncTests = [
		{
			description: 'should synchronise the database',
			expectSuccess: true,
			mocks: sequelizeMocks,
			call: {
				spy: 'sync',
				times: 1,
				error: null,
				args: [[]]
			}
		}
	]

	const errorsTests = new Map<
		string,
		{
			error: any
			code: string
		}
	>()

	errorsTests.set('should handle denied access error', {
		error: AccessDeniedError,
		code: 'ACCESS'
	})

	errorsTests.set('should handle validation error', {
		error: ValidationError,
		code: 'VALIDATION'
	})

	errorsTests.set('should handle refused connection error', {
		error: ConnectionRefusedError,
		code: 'REFUSED'
	})

	errorsTests.set('should handle time out error', {
		error: TimeoutError,
		code: 'TIMEOUT'
	})

	errorsTests.set('should handle unexpected error', {
		error: Error,
		code: 'Unexpected'
	})

	for (const [description, { error }] of errorsTests.entries()) {
		authTests.push({
			description,
			expectSuccess: false,
			mocks: () => {
				const mocks = sequelizeMocks()
				mocks.authenticate.mockRejectedValue(
					new error(new Error('mocked error message'))
				)

				return mocks
			},
			call: {
				spy: 'authenticate',
				times: 1,
				error,
				args: [[]]
			}
		})

		syncTests.push({
			description,
			expectSuccess: false,
			mocks: () => {
				const mocks = sequelizeMocks()
				mocks.sync.mockRejectedValue(
					new error(new Error('mocked error message'))
				)

				return mocks
			},
			call: {
				spy: 'sync',
				times: 1,
				error,
				args: [[]]
			}
		})
	}

	describe.each(authTests)(
		'`auth` function',
		({ description, expectSuccess, mocks, call }) => {
			it(description, async () => {
				// Setup mocks
				const spies = mocks()

				const result = await DatabaseUtils.auth(mockedSequelize).pipe(
					Effect.match({
						onSuccess: () => {
							if (!expectSuccess) {
								throw new Error('expected the effect to fail')
							}
						},
						onFailure: (error) => {
							if (expectSuccess) {
								throw new Error('expected the effect to pass')
							} else {
								expect(error).toBeInstanceOf(DatabaseHandler.AuthError)
							}
						}
					}),
					Effect.runPromise
				)

				expect(result).not.toBeDefined()
				const spyInstance = spies[call.spy as keyof typeof spies]
				expect(spyInstance).toHaveBeenCalledTimes(call.times)
			})
		}
	)

	describe.each(syncTests)(
		'`sync` function',
		({ description, expectSuccess, mocks, call }) => {
			it(description, async () => {
				// Setup mocks
				const spies = mocks()

				const result = await DatabaseUtils.sync(mockedSequelize).pipe(
					Effect.match({
						onSuccess: () => {
							if (!expectSuccess) {
								throw new Error('expected the effect to fail')
							}
						},
						onFailure: (error) => {
							if (expectSuccess) {
								throw new Error('expected the effect to pass')
							} else {
								expect(error).toBeInstanceOf(DatabaseHandler.SyncError)
							}
						}
					}),
					Effect.runPromise
				)

				expect(result).not.toBeDefined()
				const spyInstance = spies[call.spy as keyof typeof spies]
				expect(spyInstance).toHaveBeenCalledTimes(call.times)
			})
		}
	)

	const tests = [
		{
			description: 'should connect to the database',
			expectSuccess: true,
			expectedResult: (result: unknown) => {
				expect(result).toBeInstanceOf(Sequelize)
			},
			mocks: () => defaultMocks(),
			calls: [
				{
					spy: 'checkFile',
					times: 2,
					args: [[storageDir], [storageFile]]
				},
				{ spy: 'makeDir', times: 0 },
				{ spy: 'addModels', times: 1 },
				{ spy: 'auth', times: 1 },
				{ spy: 'sync', times: 1 }
			]
		},
		{
			description: 'should write directory if does not exist',
			expectSuccess: true,
			expectedResult: (result: unknown) => {
				expect(result).toBeInstanceOf(Sequelize)
			},
			mocks: () => {
				const mocks = defaultMocks()

				mocks.checkFile = jest
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
					.mockImplementationOnce((file: string) => Effect.succeed(file))

				return mocks
			},
			calls: [
				{
					spy: 'checkFile',
					times: 2,
					args: [[storageDir], [storageFile]]
				},
				{
					spy: 'makeDir',
					times: 1,
					args: [[storageDir]]
				},
				{ spy: 'addModels', times: 1 },
				{ spy: 'auth', times: 1 },
				{ spy: 'sync', times: 1 }
			]
		},
		{
			description: 'should handle file errors',
			expectSuccess: false,
			expectedResult: (result: unknown) => {
				expect(result).toBeInstanceOf(FileHandler.AccessError)
			},
			mocks: () => {
				const mocks = defaultMocks()

				mocks.checkFile = jest
					.spyOn(FileUtils, 'checkFile')
					.mockImplementation((file: string) =>
						Effect.fail(
							new FileHandler.AccessError(
								Object.assign(new Error('mocked error message'), {
									code: 'EACCESS'
								}),
								file,
								'ACCESS'
							)
						)
					)

				return mocks
			},
			calls: [
				{
					spy: 'checkFile',
					times: 1,
					args: [[storageDir], [storageFile]]
				},
				{
					spy: 'makeDir',
					times: 0,
					args: [[storageDir]]
				},
				{ spy: 'addModels', times: 0 },
				{ spy: 'auth', times: 0 },
				{ spy: 'sync', times: 0 }
			]
		}
	]

	describe.each(tests)(
		'`connect` function',
		({ description, expectSuccess, mocks, calls }) => {
			it(description, async () => {
				// Setup mocks
				const spies = mocks()

				let result
				try {
					result = await DatabaseUtils.connect()
				} catch (error) {
					if (!expectSuccess) result = error
					else console.error(error)
				}

				// Assertions
				for (const { spy, times, args } of calls) {
					const spyInstance = spies[spy as keyof typeof spies]
					expect(spyInstance).toHaveBeenCalledTimes(times)
					if (args && args.length > 0) {
						for (let i = 0; i < times; i++) {
							expect(spyInstance.mock.calls[i]).toEqual(args[i])
						}
					}
				}

				expect(result).toBeDefined()
				if (expectSuccess) {
					expect(result).toBeInstanceOf(Sequelize)
				} else {
					expect(result).not.toBeInstanceOf(Sequelize)
				}
			})
		}
	)
})
