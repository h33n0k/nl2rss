import 'reflect-metadata'
import path from 'path'

import config from 'config'
import { Effect } from 'effect'
import { Sequelize } from 'sequelize-typescript'

import * as DatabaseHandler from '../handlers/database'
import * as FileUtils from './file'
import logger from './logger'

import MailModel from '../models/mail'

/**
 * A utility function to register models with a given Sequelize instance.
 * This function ensures that the specified models are properly added to the Sequelize instance.
 *
 * @param sequelizeInstance - The Sequelize instance where the models should be registered.
 *
 * @returns An `Effect` that executes the model registration.
 *
 * @throws ModelError - If an error occurs while adding the models, it is wrapped in a `ModelError` for consistent error handling.
 *
 * @example
 * const addModelsEffect = addModels(sequelize);
 *
 * addModelsEffect.pipe(Effect.runPromise).then(() => {
 *   console.log('Models added successfully.');
 * }).catch((error) => {
 *   console.error(error); // Handles ModelError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * addModelsEffect.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const addModels = (sequelizeInstance: Sequelize) =>
	Effect.try({
		try: () => {
			sequelizeInstance.addModels([MailModel])
		},
		catch: (error) => new DatabaseHandler.ModelError(error)
	}).pipe(Effect.tap(() => logger.debug('Added database models.')))

/**
 * A utility function to authenticate a given Sequelize instance.
 * This function attempts to establish a connection to the database and verifies authentication.
 *
 * @param sequelizeInstance - The Sequelize instance to authenticate.
 *
 * @returns An `Effect` that executes the authentication process.
 *
 * @throws AuthError - If an authentication error occurs, it is wrapped in an `AuthError` for consistent error handling.
 *
 * @example
 * const authEffect = auth(sequelize);
 *
 * authEffect.pipe(Effect.runPromise).then(() => {
 *   console.log('Successfully authenticated to the database.');
 * }).catch((error) => {
 *   console.error(error); // Handles AuthError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * authEffect.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const auth = (sequelizeInstance: Sequelize) =>
	Effect.tryPromise({
		try: () => sequelizeInstance.authenticate(),
		catch: (error) => new DatabaseHandler.AuthError(error)
	}).pipe(Effect.tap(() => logger.debug('Authenticated to the database.')))

/**
 * A utility function to synchronize a given Sequelize instance with the database.
 * This function ensures that all defined models are properly synchronized with the database schema.
 *
 * @param sequelizeInstance - The Sequelize instance to synchronize.
 *
 * @returns An `Effect` that executes the synchronization process.
 *
 * @throws SyncError - If an error occurs during synchronization, it is wrapped in a `SyncError` for consistent error handling.
 *
 * @example
 * const syncEffect = sync(sequelize);
 *
 * syncEffect.pipe(Effect.runPromise).then(() => {
 *   console.log('Database synchronized successfully.');
 * }).catch((error) => {
 *   console.error(error); // Handles SyncError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * syncEffect.pipe(
 *   Effect.catchAll((error) => Effect.succeed(`Error occurred: ${error.message}`)),
 *   Effect.runPromise
 * ).then(console.log);
 */
export const sync = (sequelizeInstance: Sequelize) =>
	Effect.tryPromise({
		try: () => sequelizeInstance.sync(),
		catch: (error) => new DatabaseHandler.SyncError(error)
	}).pipe(Effect.tap(() => logger.debug('Database synchronized')))

/**
 * Establishes a connection to the SQLite database.
 * This function ensures the required data directory and database file exist before initializing Sequelize.
 * It then adds models, authenticates, and synchronizes the database.
 *
 * @returns A `Promise` that resolves when the connection is successfully established.
 * If any step fails, the error is propagated for proper handling.
 *
 * @throws AccessError - If there is an issue accessing the data directory or database file.
 * @throws AuthError - If authentication to the database fails.
 * @throws SyncError - If an error occurs while synchronizing the database schema.
 *
 * @example
 * connect().then(() => {
 *   console.log('Database connection established.');
 * }).catch((error) => {
 *   console.error(error); // Handles AccessError, AuthError, or SyncError
 * });
 *
 * @example
 * // Handling errors explicitly:
 * connect().catch((error) => {
 *   console.log(`Connection failed: ${error.message}`);
 * });
 */
export const connect = () =>
	FileUtils.checkFile(config.get<string>('data.path')).pipe(
		// check given data directory
		Effect.matchEffect({
			onSuccess: (dir) => Effect.succeed(dir),
			onFailure: (error) => {
				if (error.code === 'ENOENT') return FileUtils.makeDir(error.file) // create directory if inexistant
				return Effect.fail(error)
			}
		}),
		Effect.flatMap((directory) =>
			FileUtils.checkFile(path.join(directory, 'nl2rss.sqlite')).pipe(
				// check for database file access
				Effect.catchTag('Access', (error) => {
					if (error.code === 'ENOENT') return Effect.succeed(error.file)
					return Effect.fail(error)
				})
			)
		),
		Effect.andThen((storage) => {
			// create new instance of sequelize
			return new Sequelize({
				dialect: 'sqlite',
				storage,
				logging: false
			})
		}),
		Effect.tap(addModels),
		Effect.tap(auth),
		Effect.tap(sync),
		Effect.tap(() => logger.info('Connected to the database.')),
		Effect.runPromise
	)
