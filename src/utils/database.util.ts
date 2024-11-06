import { Effect, Schedule } from 'effect'
import { Sequelize } from 'sequelize-typescript'
import { DatabaseHandler } from '../handlers'
import * as config from './config.util'
import * as logger from './logger.util'
import { SourceModel, ArticleModel, FeedModel, SourceFeed } from '../models'

export let sequelize: Sequelize

export const disconnect = () =>
	Effect.gen(function* () {
		return Effect.tryPromise({
			try: () => sequelize.close(),
			catch: (error) => new DatabaseHandler.DatabaseDisconnectError(error)
		})
	})

export const connect = () =>
	Effect.gen(function* () {
		// require config parameters
		const retries = yield* config.getParam<number>('database.retries')
		const host = yield* config.getParam<string>('database.host')
		const port = yield* config.getParam<number>('database.port')
		const database = yield* config.getParam<string>('database.database')
		const user = yield* config.getParam<string>('database.user')
		const password = yield* config.getParam<string>('database.password')

		sequelize = new Sequelize(database, user, password, {
			dialect: 'mariadb',
			host,
			port,
			logging: false
		})

		// loading database models
		sequelize.addModels([SourceModel, ArticleModel, FeedModel, SourceFeed])

		let i = 0

		// database authentification
		yield* Effect.retry(
			Effect.tryPromise({
				try: () => {
					i++
					logger.database.verbose(`connection attempt (${i}/${retries}).`)

					return sequelize.authenticate()
				},
				catch: () => {
					if (i !== retries) {
						logger.database.warn('Failed to connect to database. retrying..')
					}

					return new DatabaseHandler.DatabaseAuthError({
						host,
						port,
						database,
						user,
						password
					})
				}
			}),
			Schedule.addDelay(Schedule.recurs(retries - 1), () => '5 seconds')
		)

		// database synchronization
		yield* Effect.tryPromise({
			try: () => sequelize.sync(/*{ force: true }*/),
			catch: (error) => new DatabaseHandler.DatabaseSyncError(error)
		})

		return sequelize
	})
		.pipe(
			Effect.catchAll((error) => {
				logger.database.error(error.message)

				return Effect.fail(error)
			}),
			Effect.runPromise
		)
		.then(() => logger.database.info('Connected to Database.'))
		.catch(() => process.exit(1))
