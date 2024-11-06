import { Effect } from 'effect'
import { FeedModel, SourceModel } from '../models'
import { DatabaseHandler } from '../handlers'
import { logger, metrics } from '../utils'
import { Op } from 'sequelize'
import * as FeedService from './feed.service'
import { SourceSchema } from '../schemas'

export const create = (name: string, address: string) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const [source, created] = yield* Effect.tryPromise({
			try: () =>
				SourceModel.findOrCreate({
					where: { address },
					defaults: { name, address }
				}),
			catch: (error) => {
				timer({ operation: 'createSource', description: 'Save Source', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		if (created) {
			// assign main feed to the created source
			const mainFeed = yield* FeedService.getMain
			source.$add('feed', mainFeed)
			logger.database.info(`Saved source into database. (${address})`)
			timer({ operation: 'createSource', description: 'Save Source', success: 'true' })
		} else {
			timer({ operation: 'fetchSource', description: 'Fetch Source', success: 'true' })
		}

		return source
	})

export const list = (allowDisabled = false, feed: FeedModel | null = null) =>
	Effect.gen(function* () {
		const include = feed
			? {
					model: FeedModel,
					required: true,
					where: { id: feed.id }
				}
			: {
					model: FeedModel
				}

		const timer = metrics.databaseResTimeHist.startTimer()
		const sources = yield* Effect.tryPromise({
			try: () =>
				SourceModel.findAll({
					include,
					where: {
						[Op.or]: [{ enabled: true }, { enabled: !allowDisabled }]
					}
				}),
			catch: (error) => {
				timer({ operation: 'fetchSources', description: 'Fetch Sources', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'fetchSources', description: 'Fetch Sources', success: 'true' })

		return sources
	})

export const get = (id: number) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const source = yield* Effect.tryPromise({
			try: () => SourceModel.findByPk(id),
			catch: (error) => {
				timer({ operation: 'fetchSource', description: 'Fetch Source', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'fetchSource', description: 'Fetch Source', success: 'true' })

		if (!source) {
			return yield* Effect.fail(new DatabaseHandler.NotFound())
		}

		return source
	})

export const set = (source: SourceModel, payload: SourceSchema.setInput['body']) =>
	Effect.gen(function* () {
		const feeds = yield* FeedService.getFeeds(payload.feeds)

		source.enabled = payload.enabled
		source.$set('feeds', feeds)

		const timer = metrics.databaseResTimeHist.startTimer()
		const updatedSource = yield* Effect.tryPromise({
			try: () => source.save(),
			catch: (error) => {
				timer({ operation: 'updateSource', description: 'Update Source', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'updateSource', description: 'Update Source', success: 'true' })

		return updatedSource
	})
