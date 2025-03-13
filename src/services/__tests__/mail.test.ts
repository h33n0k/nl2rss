import path from 'path'

import config from 'config'
import { Effect } from 'effect'
import { faker } from '@faker-js/faker'

import * as FileHandler from '../../handlers/file'
import * as MailService from '../mail'
import { Mail } from '../../schemas/mail'

import * as FileUtils from '../../utils/file'
jest.mock('../../utils/logger')
jest.mock('../../utils/file')

const mockMail = (): Mail => ({
	address: faker.internet.email(),
	date: new Date().toString(),
	html: faker.lorem.paragraphs(),
	subject: faker.lorem.sentence(),
	name: faker.person.fullName()
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

	describe('`save` method', () => {
		describe('Return value', () => {
			it('should returns the writted file path', async () => {
				const mockedMail = mockMail()
				const id = Effect.runSync(MailService.genId(mockedMail))
				const file = path.join(
					config.get<string>('data.path'),
					'mails',
					`${id}.html`
				)

				jest.spyOn(MailService, 'genId')
				jest.spyOn(FileUtils, 'write')

				await MailService.save(mockedMail).pipe(
					Effect.match({
						onFailure: () => {
							throw new Error('Expected the effect to pass')
						},
						onSuccess: (value) => {
							expect(value).toBeDefined()
							expect(value).toBe(file)
						}
					}),
					Effect.runPromise
				)

				expect(MailService.genId).toHaveBeenCalledTimes(1)
				expect(MailService.genId).toHaveBeenCalledWith(mockedMail)
				expect(FileUtils.write).toHaveBeenCalledTimes(1)
				expect(FileUtils.write).toHaveBeenCalledWith(file, mockedMail.html)
			})
		})

		describe('Error handling', () => {
			it('should handle write errors', async () => {
				const mockedMail = mockMail()
				const id = Effect.runSync(MailService.genId(mockedMail))
				const file = path.join(
					config.get<string>('data.path'),
					'mails',
					`${id}.html`
				)

				jest.spyOn(MailService, 'genId')
				jest
					.spyOn(FileUtils, 'write')
					.mockImplementation((file: string, content: string) =>
						Effect.fail(
							new FileHandler.AccessError(
								Object.assign(new Error('Mocked error message'), {
									code: 'EACCESS'
								}),
								file,
								'WRITE'
							)
						)
					)

				await MailService.save(mockedMail).pipe(
					Effect.match({
						onFailure: (error) => {
							expect(error).toBeDefined()
							expect(error).toBeInstanceOf(FileHandler.AccessError)
							expect(error.code).toBe('EACCESS')
						},
						onSuccess: () => {
							throw new Error('Expected the effect to fail')
						}
					}),
					Effect.runPromise
				)

				expect(MailService.genId).toHaveBeenCalledTimes(1)
				expect(MailService.genId).toHaveBeenCalledWith(mockedMail)
				expect(FileUtils.write).toHaveBeenCalledTimes(1)
				expect(FileUtils.write).toHaveBeenCalledWith(file, mockedMail.html)
			})
		})
	})
})
