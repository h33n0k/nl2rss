import { Effect, Data, Schedule } from 'effect'
import { Schema } from '@effect/schema'
import Imap from 'imap'
import { ParsedMail, simpleParser } from 'mailparser'
import { MailSchema } from '../schemas'
import { ArticleService, SourceService } from '../services'
import * as config from './config.util'
import { hashString } from './hash.util'
import { imap as logger } from './logger.util'

class BoxError extends Data.TaggedError('Box') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown, box: string) {
		super()
		this.message = `Failed to open box '${box}'`
		this.error = error
	}
}

class UndefinedImapClientError extends Data.TaggedError('UndefinedImapClient') {
	public readonly message: string
	constructor() {
		super()
		this.message = 'The IMAP client has not been initialized.'
	}
}

class MailParseError extends Data.TaggedError('ImapParse') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown) {
		super()
		this.message = 'Failed to parse'
		this.error = error
	}
}

class ImapFetchError extends Data.TaggedError('ImapFetch') {
	public readonly message: string
	constructor(error: any) {
		super()
		this.message = 'Imap Fetch Failed.'
		console.log(error)
	}
}

class ImapConnectionError extends Data.TaggedError('ImapConnection') {
	public readonly message: string
	constructor(
		error: any,
		connection: {
			user: string
			password: string
			host: string
			port: number
			tls: boolean
		}
	) {
		super()

		if (error instanceof Error) {
			console.log(error.name)
		}

		const password = new Array(connection.password.length).fill('*').join('')
		this.message = `Connection Refused to ${connection.user}:${password}@${connection.host}:${connection.port} TLS=${connection.tls}`
	}
}

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

					return new ImapConnectionError(error, { user, password, host, port, tls })
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
		const buffer = yield* Effect.tryPromise({
			try: () => {
				const chunks: Buffer[] = []

				return new Promise<Buffer>((resolve, reject) => {
					stream.on('data', (chunk: any) => chunks.push(chunk))
					stream.on('end', () => resolve(Buffer.concat(chunks)))
					stream.on('error', reject)
				})
			},
			catch: (error) => new MailParseError(error)
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
			catch: (error) => new MailParseError(error)
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
		})

		return parsed
	})

export const fetchMails = (n: string | number = '*') =>
	Effect.gen(function* () {
		logger.info('Fetching mails..')

		if (!client) {
			return yield* Effect.fail(new UndefinedImapClientError())
		}

		const f = yield* Effect.try({
			try: () => client.seq.fetch(`1:${n}`, { envelope: true, bodies: '' }),
			catch: (error: any) => new ImapFetchError(error)
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
			catch: (error: any) => new ImapFetchError(error)
		})

		logger.info(`${raws.length} Mails fetched.`)

		for (const raw of raws) {
			const mail = yield* parseMail(raw)
			const source = yield* SourceService.create(mail.name, mail.address)
			yield* ArticleService.create(mail.uid, mail.subject, source)
			yield* ArticleService.write(mail.uid, mail.html)
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
			catch: (error) => new BoxError(error, box)
		})

		yield* fetchMails()
	}).pipe(Effect.runPromise)
