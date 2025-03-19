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
import { Default } from 'sequelize-typescript'
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

interface DefaultMocks {
	genId: jest.SpyInstance
	write: jest.SpyInstance
	create: jest.SpyInstance
}

const defaultMocks = (): DefaultMocks => ({
	genId: jest
		.spyOn(MailService, 'genId')
		.mockImplementation(() => Effect.succeed(mockedId)),
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
		)
})

describe('services/mail', () => {
	describe('`genID` method', () => {
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

	const sequelize = database.sequelize
	beforeAll(async () => {
		sequelize.addModels([MailModel])
		await database.init()
		await database.connect()
	})

	afterAll(async () => {
		await database.disconnect()
	})

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
		'`save` method',
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
											return { ...mockedMail, file: path.basename(mockedFile) }
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

	// 	describe('`save` method', () => {

	// 		const sequelize = database.sequelize
	// 		sequelize.addModels([MailModel])
	// 		beforeAll(async () => {
	// 			await database.init()
	// 			await database.connect()
	// 		})

	// 		afterAll(async () => {
	// 			await database.disconnect()
	// 		})

	// 		describe('Return value', () => {
	// 			it('should returns the mail model', async () => {
	// 				const mockedMail = mockMail()
	// 				const id = Effect.runSync(MailService.genId(mockedMail))
	// 				const file = path.join(
	// 					config.get<string>('data.path'),
	// 					'mails',
	// 					`${id}.html`
	// 				)

	// 				jest.spyOn(MailService, 'genId')
	// 				jest.spyOn(FileUtils, 'write')
	// 				jest.spyOn(MailModel, 'create')

	// 				await MailService.save(mockedMail).pipe(
	// 					Effect.match({
	// 						onFailure: (error) => {
	// 							console.error(error)
	// 							throw new Error('Expected the effect to pass.')
	// 						},
	// 						onSuccess: (value) => {
	// 							expect(value).toBeDefined()
	// 							expect(value).toBeInstanceOf(MailModel)
	// 							expect(value.address).toEqual(mockedMail.address)
	// 						}
	// 					}),
	// 					Effect.runPromise
	// 				)

	// 				expect(MailService.genId).toHaveBeenCalledTimes(1)
	// 				expect(MailService.genId).toHaveBeenCalledWith(mockedMail)
	// 				expect(FileUtils.write).toHaveBeenCalledTimes(1)
	// 				expect(FileUtils.write).toHaveBeenCalledWith(file, mockedMail.html)
	// 				expect(MailModel.create).toHaveBeenCalledTimes(1)
	// 			})
	// 		})

	// 		describe('Error handling', () => {
	// 			it('should handle write errors', async () => {
	// 				const mockedMail = mockMail()
	// 				const id = Effect.runSync(MailService.genId(mockedMail))
	// 				const file = path.join(
	// 					config.get<string>('data.path'),
	// 					'mails',
	// 					`${id}.html`
	// 				)

	// 				jest.spyOn(MailService, 'genId')
	// 				jest
	// 					.spyOn(FileUtils, 'write')
	// 					.mockImplementation((file: string, content: string) =>
	// 						Effect.fail(
	// 							new FileHandler.AccessError(
	// 								Object.assign(new Error('Mocked error message'), {
	// 									code: 'EACCESS'
	// 								}),
	// 								file,
	// 								'WRITE'
	// 							)
	// 						)
	// 					)

	// 				await MailService.save(mockedMail).pipe(
	// 					Effect.match({
	// 						onFailure: (error) => {
	// 							expect(error).toBeDefined()
	// 							expect(error).toBeInstanceOf(FileHandler.AccessError)
	// 							expect(error.code).toBe('EACCESS')
	// 						},
	// 						onSuccess: () => {
	// 							throw new Error('Expected the effect to fail.')
	// 						}
	// 					}),
	// 					Effect.runPromise
	// 				)

	// 				expect(MailService.genId).toHaveBeenCalledTimes(1)
	// 				expect(MailService.genId).toHaveBeenCalledWith(mockedMail)
	// 				expect(FileUtils.write).toHaveBeenCalledTimes(1)
	// 				expect(FileUtils.write).toHaveBeenCalledWith(file, mockedMail.html)
	// 			})
	// 		})
	// 	})
})
