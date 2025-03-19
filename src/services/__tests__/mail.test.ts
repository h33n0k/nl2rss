import path from 'path'

import config from 'config'
import { Effect } from 'effect'
import { faker } from '@faker-js/faker'
import * as database from '../../utils/__mocks__/database'

import * as MailHandler from '../../handlers/mail'
import * as DatabaseHandler from '../../handlers/database'
import * as FileHandler from '../../handlers/file'
import * as MailService from '../mail'
import { Mail } from '../../schemas/mail'

import * as FileUtils from '../../utils/file'
import MailModel, { Input as MailModelInput } from '../../models/mail'

jest.mock('../../utils/logger')
jest.mock('../../utils/file')

const mockMail = (): Mail => ({
	address: faker.internet.email(),
	date: new Date().toString(),
	html: faker.lorem.paragraph(),
	subject: faker.lorem.sentence(),
	name: faker.person.fullName()
})

const mockedId = faker.string.uuid()
let mockedMailLength = 0
let mockedMails: MailModel[] = []

interface DefaultMocks {
	genId: jest.SpyInstance
	checkFile: jest.SpyInstance
	write: jest.SpyInstance
	create: jest.SpyInstance
	findAll: jest.SpyInstance
}

const sequelize = database.sequelize

const defaultMocks = (): DefaultMocks => ({
	genId: jest
		.spyOn(MailService, 'genId')
		.mockImplementation(() => Effect.succeed(mockedId)),
	checkFile: jest
		.spyOn(FileUtils, 'checkFile')
		.mockImplementation((file: string) => Effect.succeed(file)),
	write: jest
		.spyOn(FileUtils, 'write')
		.mockImplementation((file: string) => Effect.succeed(file)),
	create: jest
		.spyOn(MailModel, 'create')
		.mockImplementation(
			(values?: Partial<MailModelInput>) =>
				new Promise<MailModel>((resolve) =>
					resolve(new MailModel(values as MailModelInput))
				)
		),
	findAll: jest.spyOn(MailModel, 'findAll')
})

describe('services/mail', () => {
	beforeAll(async () => {
		sequelize.addModels([MailModel])
		await database.init()
		await database.connect()
	})

	beforeEach(async () => {
		mockedMailLength = faker.number.int({ min: 5, max: 15 })
		mockedMails = new Array(mockedMailLength)
			.fill(null)
			.map(
				() =>
					new MailModel({ ...mockMail(), file: `${faker.string.uuid()}.html` })
			)

		for (const mail of mockedMails) {
			await new Promise<void>((resolve) => setTimeout(resolve, 5))
			await mail.save()
		}
	})

	afterAll(async () => {
		await database.disconnect()
	})

	describe('`genID` method:', () => {
		it('should generate imutable hash from input', () => {
			const mockedMail = mockMail()
			const call1 = Effect.runSync(MailService.genId(mockedMail))
			const call2 = Effect.runSync(MailService.genId(mockedMail))

			for (const call of [call1, call2]) {
				expect(call).toBeDefined()
			}

			expect(call2).toBe(call1)
		})
	})

	describe('`save` method:', () => {
		interface TestCall {
			spy: keyof DefaultMocks
			times: number
			args?: ('file' | 'mail' | 'input' | keyof Mail)[][]
		}

		const defaultCalls: TestCall[] = [
			{
				spy: 'genId',
				times: 1,
				args: [['mail']]
			},
			{
				spy: 'write',
				times: 1,
				args: [['file']]
			},
			{
				spy: 'create',
				times: 1,
				args: [['input']]
			}
		]

		const tests: {
			description: string
			expectSuccess: boolean
			mail: () => Mail
			mocks: () => DefaultMocks
			calls: TestCall[]
			expectError?: any
		}[] = [
			{
				description: 'should save given mail',
				expectSuccess: true,
				mail: mockMail,
				mocks: defaultMocks,
				calls: defaultCalls
			}
		]

		const errors = new Map<
			string,
			{
				error: any
				mock: keyof DefaultMocks
				expectedHandler:
					| typeof DatabaseHandler.QueryError
					| typeof FileHandler.AccessError
					| typeof MailHandler.IdError
			}
		>()

		errors.set('should handle id errors', {
			error: new MailHandler.IdError(
				new Error('mocked error message'),
				mockMail()
			),
			mock: 'genId',
			expectedHandler: MailHandler.IdError
		})

		errors.set('should handle file errors', {
			error: new FileHandler.AccessError(
				new Error('mocked error message'),
				mockedId,
				'WRITE'
			),
			mock: 'write',
			expectedHandler: FileHandler.AccessError
		})

		errors.set('should handle query errors', {
			error: new DatabaseHandler.QueryError(new Error('mocked error message')),
			mock: 'create',
			expectedHandler: DatabaseHandler.QueryError
		})

		for (const [
			description,
			{ error, mock, expectedHandler }
		] of errors.entries()) {
			const calls = [...defaultCalls]
			switch (mock) {
				case 'genId':
					calls[1].times = 0
					calls[2].times = 0
					break
				case 'write':
					calls[2].times = 0
					break
			}

			const mocks = () => {
				const m = defaultMocks()

				switch (mock) {
					case 'genId':
						m.genId = jest
							.spyOn(MailService, 'genId')
							.mockImplementation(() => Effect.fail(error))
						break
					case 'write':
						m.write = jest
							.spyOn(FileUtils, 'write')
							.mockImplementation(() => Effect.fail(error))
						break
					case 'create':
						m.create = jest
							.spyOn(MailModel, 'create')
							.mockImplementation(
								() => new Promise<MailModel>((_, reject) => reject(error))
							)
						break
				}

				return m
			}

			tests.push({
				description,
				expectSuccess: false,
				mail: mockMail,
				expectError: expectedHandler,
				mocks,
				calls
			})
		}

		describe.each(tests)(
			'suit:',
			({ description, expectSuccess, mail, mocks, calls, expectError }) => {
				it(description, async () => {
					// Setup mocks
					const spies = mocks()
					const mockedMail = mail()

					await MailService.save(mockedMail).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeInstanceOf(MailModel)
								} else {
									throw new Error('Expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									expect(error).toBeInstanceOf(expectError)
								} else {
									throw error
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
									const mockedFile = path.join(
										config.get<string>('data.path'),
										'mails',
										`${mockedId}.html`
									)

									const v = args[i].map((arg) => {
										switch (true) {
											case arg === 'mail':
												return mockedMail
											case arg === 'file':
												return mockedFile
											case arg === 'input':
												return {
													...mockedMail,
													file: path.basename(mockedFile)
												}
											case arg in mockedMail:
												return mockedMail[arg]
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

	describe('`getLatest` method:', () => {
		interface TestCall {
			spy: keyof DefaultMocks
			times: number
			args?: 'file'[][]
		}

		const defaultCalls: TestCall[] = [
			{
				spy: 'findAll',
				times: 1
			},
			{
				spy: 'checkFile',
				times: mockedMailLength
			}
		]

		const tests: {
			description: string
			expectSuccess: boolean
			expectLength?: (mocked: number) => number
			mocks: () => DefaultMocks
			calls: TestCall[]
			expectError?: any
		}[] = [
			{
				description: 'should retreive n latest mail',
				expectSuccess: true,
				mocks: defaultMocks,
				calls: defaultCalls
			},
			{
				description: 'should filter inexistant files',
				expectSuccess: true,
				expectLength: (mocked) => mocked - 1,
				mocks: () => {
					const m = defaultMocks()

					m.checkFile = m.checkFile.mockImplementationOnce((file: string) =>
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
				calls: defaultCalls
			},
			{
				description: 'should handle query errors.',
				expectSuccess: false,
				mocks: () => {
					const m = defaultMocks()

					m.findAll = jest
						.spyOn(MailModel, 'findAll')
						.mockImplementation(
							() =>
								new Promise<MailModel[]>((_, reject) =>
									reject(new Error('mocked error message.'))
								)
						)

					return m
				},
				expectError: DatabaseHandler.QueryError,
				calls: (() => {
					const c = defaultCalls

					c[1].times = 0

					return c
				})()
			}
		]

		describe.each(tests)(
			'suit:',
			({
				description,
				expectSuccess,
				expectLength,
				mocks,
				calls,
				expectError
			}) => {
				it(description, async () => {
					// Setup mocks
					const spies = mocks()

					await MailService.getLatest(mockedMailLength).pipe(
						Effect.match({
							onSuccess: (result) => {
								if (expectSuccess) {
									expect(result).toBeInstanceOf(Array)

									if (expectLength) {
										expect(result.length).toEqual(
											expectLength(mockedMailLength)
										)
									} else {
										expect(result.length).toEqual(mockedMailLength)
										expect(result[0].createdAt.getTime()).toBeLessThan(
											result[1].createdAt.getTime()
										)
									}

									expect(result[0]).toBeInstanceOf(MailModel)
								} else {
									throw new Error('Expected the effect to fail.')
								}
							},
							onFailure: (error) => {
								if (!expectSuccess) {
									expect(error).toBeInstanceOf(expectError)
								} else {
									throw error
								}
							}
						}),
						Effect.runPromise
					)

					// Assertions
					for (const { spy, times } of calls) {
						if (times > 0) {
							const spyInstance = spies[spy as keyof typeof spies]
							expect(spyInstance).toHaveBeenCalledTimes(times)
						}
					}
				})
			}
		)
	})
})
