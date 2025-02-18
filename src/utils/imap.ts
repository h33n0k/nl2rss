import { Effect, Schedule } from 'effect'

import config from 'config'
import Imap from 'imap'

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
		})
	}).pipe(Effect.runPromise)
