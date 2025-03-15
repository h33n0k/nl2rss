import path from 'path'

import config from 'config'
import { Effect } from 'effect'
import { Sequelize } from 'sequelize-typescript'

import * as DatabaseHandler from '../handlers/database'
import * as FileUtils from './file'
import logger from './logger'

export let sequelize: Sequelize

// Sequelize auth
export const auth = (sequelizeInstance: Sequelize) =>
	Effect.tryPromise({
		try: () => sequelizeInstance.authenticate(),
		catch: (error) => new DatabaseHandler.AuthError(error)
	}).pipe(Effect.tap(() => logger.debug('Authenticated to the database.')))

// Sequelize sync
export const sync = (sequelizeInstance: Sequelize) =>
	Effect.tryPromise({
		try: () => sequelizeInstance.sync(),
		catch: (error) => new DatabaseHandler.SyncError(error)
	}).pipe(Effect.tap(() => logger.debug('Database synchronized')))

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
			sequelize = new Sequelize({
				dialect: 'sqlite',
				storage,
				logging: false
			})

			return sequelize
		}),
		// auth and sync to the database
		Effect.tap(auth),
		Effect.tap(sync),
		Effect.tap(() => logger.info('Connected to the database.')),
		Effect.runPromise
	)
