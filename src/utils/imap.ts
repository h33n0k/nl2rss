import { Effect, Schedule } from 'effect'

import config from 'config'
import Imap from 'imap'
import { ParsedMail, simpleParser } from 'mailparser'

import * as MailSchema from '../schemas/mail'

import logger from './logger'
import * as ImapHandler from '../handlers/imap'

let client: Imap

export const connect = () =>
	Effect.gen(function* () {
		const retries = config.get<number>('imap.retries')
		const port = config.get<number>('imap.port')
		const tls = config.get<boolean>('imap.tls')
		const host = config.get<string>('imap.host')
		const user = config.get<string>('imap.user')
		const password = config.get<string>('imap.password')

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

					return new ImapHandler.ConnectionError(error, {
						user,
						host,
						port,
						tls
					})
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

export const parseMail = (stream: NodeJS.ReadableStream) =>
	Effect.gen(function* () {
		logger.debug('Parsing mail.')

		const buffer = yield* Effect.tryPromise({
			try: () => {
				const chunks: Buffer[] = []

				return new Promise<Buffer>((resolve, reject) => {
					stream.on('data', (chunk: Buffer) => chunks.push(chunk))
					stream.on('end', () => resolve(Buffer.concat(chunks)))
					stream.on('error', reject)
				})
			},
			catch: (error: unknown) => new ImapHandler.ParseError(error)
		})

		const mail = yield* Effect.tryPromise({
			try: () =>
				new Promise<ParsedMail>((resolve, reject) => {
					simpleParser(buffer, (error, mail) => {
						if (error) reject(error)
						resolve(mail)
					})
				}),
			catch: (error) => new ImapHandler.ParseError(error)
		})

		return yield* Effect.try({
			try: () =>
				MailSchema.schema.parse({
					address: mail.from?.value[0].address,
					name: mail.from?.value[0].name,
					subject: mail.subject,
					date: mail.date?.toString(),
					html: mail.html || mail.textAsHtml
				}),
			catch: (error) => new ImapHandler.ParseError(error)
		})
	})

export const fetchMails = (n: number) =>
	Effect.gen(function* () {
		logger.info('Fetching mails.')
		if (!client) return yield* Effect.fail(new ImapHandler.ClientError(client))

		const f = yield* Effect.try({
			try: () => client.seq.fetch(`1:${n}`, { envelope: true, bodies: '' }),
			catch: (error: unknown) => new ImapHandler.FetchError(error)
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
			catch: (error: unknown) => new ImapHandler.FetchError(error)
		})

		logger.info(`${raws.length} mail(s) fetched.`)

		const mails: MailSchema.Mail[] = []

		for (const raw of raws) {
			yield* parseMail(raw).pipe(
				Effect.flatMap((mail) => {
					mails.push(mail)
					return Effect.succeed(mail)
				}),
				Effect.catchAll((error) => {
					logger.warn(error.message)
					return Effect.fail(error)
				})
			)
		}

		return mails
	})

export const listen = () =>
	Effect.gen(function* () {
		const imapBox = config.get<string>('imap.box')

		// open Imap box
		yield* Effect.tryPromise({
			try: () => {
				return new Promise((resolve, reject) => {
					client.openBox(imapBox, (error, box) => {
						if (error) reject(error)
						logger.info(`Opened box '${imapBox}'`)
						resolve(box)
					})
				})
			},
			catch: (error) => new ImapHandler.BoxError(error, imapBox)
		})

		client.on('mail', (n: number) => {
			logger.info(`${n} new mail(s) received.`)
			fetchMails(n).pipe(
				Effect.flatMap((mails) => {
					console.log({ mails })
					return Effect.succeed(mails)
				}),
				Effect.ignore,
				Effect.runPromise
			)
		})
	}).pipe(Effect.runPromise)
