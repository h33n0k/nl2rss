import path from 'path'
import { createHash } from 'crypto'

import config from 'config'
import { Effect } from 'effect'
import { Op } from 'sequelize'

import * as MailHandler from '../handlers/mail'
import { Mail } from '../schemas/mail'
import MailModel from '../models/mail'

import * as DatabaseHandler from '../handlers/database'
import logger from '../utils/logger'
import { checkFile, write } from '../utils/file'

/**
 * Generates a unique identifier (SHA-256 hash) for a given email object based on its date and address.
 *
 * @param mail - The email based of the mail schema. The date is converted to a string and concatenated with the address before hashing.
 *
 * @returns An `Effect` that yields the SHA-256 hash string computed from the email's date and address.
 *
 * @example
 * const id = genId(mail);
 *
 * id.pipe(Effect.runPromise).then((id) => {
 *   console.log(`Generated ID: ${id}`); // Outputs a SHA-256 hash
 * });
 *
 * @example
 * // Handling errors explicitly:
 * id.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const genId = (mail: Mail) =>
	Effect.gen(function* () {
		const sentence = `${mail.date.toString()}${mail.address}`
		return yield* Effect.try({
			try: () => createHash('sha256').update(sentence).digest('hex'),
			catch: (error) => new MailHandler.IdError(error, mail)
		})
	})

/**
 * Saves an email as an HTML file in the configured data directory and records it in the database.
 *
 * @param mail - The email based of the mail schema.
 *
 * @returns An `Effect` that yields the file path where the email has been saved.
 *
 * @throws AccessError - If there is an issue with writing the file.
 * @throws QueryError - If an issue occurs while saving the email record in the database.
 *
 * @example
 * const saveMail = save(mail);
 *
 * saveMail.pipe(Effect.runPromise).then((file) => {
 *   console.log(`Saved mail at: ${file}`); // Outputs the saved file path
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError or QueryError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * saveMail.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const save = (mail: Mail) =>
	genId(mail).pipe(
		Effect.map((id) =>
			path.join(config.get<string>('data.path'), 'mails', `${id}.html`)
		),
		Effect.flatMap((file) => write(file, mail.html)),
		Effect.flatMap((file) =>
			Effect.tryPromise({
				try: () => MailModel.create({ ...mail, file: path.basename(file) }),
				catch: (error) => new DatabaseHandler.QueryError(error)
			})
		),
		Effect.tap((mail) => logger.debug(`Saved mail record ${mail.id}`)),
		Effect.tap((mail) => logger.info(`Saved mail ${mail.file}`))
	)

/**
 * Retrieves the latest non-deleted emails from the database, filtering out entries with missing files.
 *
 * @param n - The maximum number of emails to retrieve.
 *
 * @returns An `Effect` that resolves to an array of `MailModel` instances.
 *
 * @throws QueryError - If an issue occurs while querying the database.
 *
 * @example
 * const latestMails = getLatest(5);
 *
 * latestMails.pipe(Effect.runPromise).then((mails) => {
 *   console.log(`Retrieved ${mails.length} emails.`);
 * }).catch((error) => {
 *   console.error(error); // Handles QueryError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * getLatest(5).pipe(
 *   Effect.catchAll((error) => Effect.succeed([])), // Return an empty array on failure
 *   Effect.runPromise
 * ).then(console.log);
 */
export const getLatest = (n: number) =>
	Effect.tryPromise({
		try: () =>
			MailModel.findAll({
				where: { deletedAt: { [Op.is]: undefined } },
				order: [['createdAt', 'ASC']],
				limit: n
			}),
		catch: (error) => new DatabaseHandler.QueryError(error)
	}).pipe(
		Effect.flatMap((mails) =>
			Effect.gen(function* () {
				const filtered: MailModel[] = []
				for (const mail of mails) {
					yield* checkFile(
						path.join(config.get<string>('data.path'), 'mails', mail.file)
					).pipe(
						Effect.match({
							onSuccess: () => filtered.push(mail),
							onFailure: (error) => {
								logger.warn(`${error.title}, ${error.message}`)
								return Effect.ignore(error)
							}
						})
					)
				}

				return filtered
			})
		)
	)
