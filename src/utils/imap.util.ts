import { Effect, Schedule } from 'effect'
import { Schema } from '@effect/schema'
import Imap from 'imap'
import { ParsedMail, simpleParser } from 'mailparser'
import { MailSchema } from '../schemas'
import { ArticleService, SourceService } from '../services'
import * as config from './config.util'
import { hashString } from './hash.util'
import { imap as logger } from './logger.util'
import { ImapHandler } from '../handlers'

let client: Imap

export const connect = () =>
	Effect.gen(function* () {
		const retries = yield* config.getParam<number>('imap.retries')
		const user = yield* config.getParam<string>('imap.user')
		const password = yield* config.getParam<string>('imap.password')
		const host = yield* config.getParam<string>('imap.host')
		const port = yield* config.getParam<number>('imap.port')
		const tls = yield* config.getParam<boolean>('imap.tls')

		client = new Imap({
			user,
			password,
			host,
			port,
			tls
		})

		let i = 0
		yield* Effect.retry(
			Effect.tryPromise({
				try: () => {
					i++
					logger.verbose(`connection attempt (${i}/${retries}).`)

					return new Promise<void>((resolve, reject) => {
						client.once('ready', resolve)
						client.once('error', reject)
						client.connect()
					})
				},
				catch: (error) => {
					if (i !== retries) {
						logger.warn('Failed to connect to the IMAP Server. retrying..')
					}

					return new ImapHandler.ImapConnectionError(error, { user, password, host, port, tls })
				}
			}),
			Schedule.addDelay(Schedule.recurs(retries - 1), () => '5 seconds')
		)
	})
		.pipe(
			Effect.catchAll((error) => {
				logger.error(error.message)

				return Effect.fail(error)
			}),
			Effect.runPromise
		)
		.then(() => logger.info('Connected to the IMAP Server.'))
		.catch(() => process.exit(1))

const parseMail = (stream: NodeJS.ReadableStream) =>
	Effect.gen(function* () {
		logger.debug('parsing mail')
		const buffer = yield* Effect.tryPromise({
			try: () => {
				const chunks: Buffer[] = []

				return new Promise<Buffer>((resolve, reject) => {
					stream.on('data', (chunk: any) => chunks.push(chunk))
					stream.on('end', () => resolve(Buffer.concat(chunks)))
					stream.on('error', reject)
				})
			},
			catch: (error) => new ImapHandler.MailParseError(error)
		})

		const mail = yield* Effect.tryPromise({
			try: () =>
				new Promise<ParsedMail>((resolve, reject) => {
					simpleParser(buffer, (error, mail) => {
						if (error) {
							reject(error)
						}

						resolve(mail)
					})
				}),
			catch: (error) => new ImapHandler.MailParseError(error)
		})

		const parsed = yield* Schema.decodeUnknown(MailSchema.schema, {
			onExcessProperty: 'ignore'
		})({
			address: mail.from?.value[0].address,
			name: mail.from?.value[0].name,
			subject: mail.subject,
			date: mail.date?.toString(),
			html: mail.html || mail.textAsHtml,
			uid: hashString(`${mail.from?.value[0].address}${mail.subject}${mail.date?.toString()}`)
		}).pipe(Effect.catchAll((error) => new ImapHandler.MailParseError(error)))

		return parsed
	})

let totalMails = 0
export const fetchMails = (n: string | number = '*') =>
	Effect.gen(function* () {
		logger.info('Fetching mails..')

		if (!client) {
			return yield* Effect.fail(new ImapHandler.UndefinedImapClientError())
		}

		let start = 1
		let end = '*' as number | string

		if (typeof n === 'number') {
			totalMails += n
			start = Math.max(1, totalMails - n + 1)
			end = totalMails
		}

		const f = yield* Effect.try({
			try: () => client.seq.fetch(`${start}:${end}`, { envelope: true, bodies: '' }),
			catch: (error: any) => new ImapHandler.ImapFetchError(error)
		})

		const raws = yield* Effect.tryPromise({
			try: () =>
				new Promise<NodeJS.ReadableStream[]>((resolve) => {
					const array: NodeJS.ReadableStream[] = []
					f.on('end', () => resolve(array))
					f.on('message', (message) => {
						message.on('body', (stream) => {
							array.push(stream)
						})
					})
				}),
			catch: (error: any) => new ImapHandler.ImapFetchError(error)
		})

		logger.info(`${raws.length} Mails fetched.`)

		if (n === '*') {
			totalMails = raws.length
		}

		for (const raw of raws) {
			yield* parseMail(raw).pipe(
				Effect.flatMap((mail) =>
					Effect.gen(function* () {
						logger.debug('saving mail into database..')
						const source = yield* SourceService.create(mail.name, mail.address)
						yield* ArticleService.create(mail.uid, mail.subject, source)
						yield* ArticleService.write(mail.uid, mail.html)
					})
				),
				Effect.catchTags({
					MailParse: (error) => {
						logger.warn('Could not parse mail content')

						return Effect.fail(error)
					},
					DatabaseQuery: (error) => {
						logger.warn('Could not save mail into database')

						return Effect.fail(error)
					}
				}),
				Effect.catchAll(() => {
					logger.info('Skipping..')

					return Effect.succeed(null)
				})
			)
		}
	})

export const listen = () =>
	Effect.gen(function* () {
		const box = yield* config.getParam<string>('imap.box')

		// open INBOX
		yield* Effect.tryPromise({
			try: () => {
				logger.verbose('oppening inbox')

				return new Promise((resolve, reject) => {
					client.openBox('INBOX', (error, box) => {
						if (error) {
							reject(error)
						}

						resolve(box)
					})
				})
			},
			catch: (error) => new ImapHandler.BoxError(error, box)
		})

		yield* fetchMails()
		client.on('mail', (n: number) => {
			logger.info(`${n} new Mail(s) received.`)
			fetchMails(n).pipe(
				Effect.catchTags({
					ImapFetch: (error) => {
						logger.error('Could not fetch new mails.')

						return Effect.fail(error)
					}
				}),
				Effect.ignore,
				Effect.runPromise
			)
		})
	}).pipe(Effect.runPromise)
