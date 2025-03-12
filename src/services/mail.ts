import path from 'path'
import { createHash } from 'crypto'

import config from 'config'
import { Effect } from 'effect'

import * as MailHandler from '../handlers/mail'
import { Mail } from '../schemas/mail'
import logger from '../utils/logger'
import { write } from '../utils/file'

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
 * Saves an email as an HTML file in the configured data directory.
 * The file name is generated using a SHA-256 hash of the email's date and address.
 *
 * @param mail - The email based of the mail schema.
 *
 * @returns An `Effect` that yields the file path where the email has been saved.
 *
 * @throws AccessError - If there is an issue with writing the file.
 *
 * @example
 * const saveMail = save(mail);
 *
 * saveMail.pipe(Effect.runPromise).then((file) => {
 *   console.log(`Saved mail at: ${file}`); // Outputs the saved file path
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError
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
		Effect.tap((file) => logger.info(`Saved mail ${file}`))
	)
