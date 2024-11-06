import c from 'config'
import path from 'path'
import { Data, Effect } from 'effect'
import { Op } from 'sequelize'
import { logger, metrics, config } from '../utils'
import * as file from '../utils/file.util'
import { FeedModel } from '../models'
import { DatabaseHandler } from '../handlers'
import * as ArticleService from './article.service'
import RSS from 'rss'
import { FeedSchema } from '../schemas'
import { Json } from '../types/response.type'

export class MainFeedError extends Data.TaggedClass('MainFeed') {
	public readonly message: string = "Can't delete main feed"
	public readonly response: Json = {
		status: 403,
		type: 'forbidden',
		message: "Can't delete main feed",
		errors: []
	}
}

const feedsPath = file.checkDir(path.join(c.get<string>('content.path'), 'feeds/')).pipe(
	Effect.catchAll((error) => {
		logger.main.error(error.message)

		return Effect.fail(error)
	})
)

export const getMain = Effect.gen(function* () {
	const timer = metrics.databaseResTimeHist.startTimer()
	const [feed, created] = yield* Effect.tryPromise({
		try: () =>
			FeedModel.findOrCreate({
				where: { main: true },
				defaults: {
					name: 'all',
					title: 'All Available Articles',
					description: 'All Fetched Emails.',
					main: true
				}
			}),
		catch: (error) => {
			timer({ operation: 'fetchFeed', description: 'Fetch Main Feed', success: 'false' })

			return new DatabaseHandler.QueryError(error)
		}
	})

	if (created) {
		logger.database.info('Created main feed.')
		timer({ operation: 'createFeed', description: 'Create Main Feed', success: 'true' })
	} else {
		timer({ operation: 'fetchFeed', description: 'Fetch Main Feed', success: 'true' })
	}

	return feed
})

export const getFeeds = (ids: number[]) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const feeds = yield* Effect.tryPromise({
			try: () =>
				FeedModel.findAll({
					where: {
						id: {
							[Op.in]: ids
						}
					}
				}),
			catch: (error) => {
				timer({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'true' })

		return feeds
	})

export const get = (identifier: string | number, allowDisabled = false) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const feed = yield* Effect.tryPromise({
			try: () =>
				FeedModel.findOne({
					where: {
						...(typeof identifier === 'number' ? { id: identifier } : { name: identifier }),
						[Op.or]: [{ enabled: true }, { enabled: !allowDisabled }]
					}
				}),
			catch: (error) => {
				timer({ operation: 'fetchFeed', description: 'Fetch Feed', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'fetchFeed', description: 'Fetch Feed', success: 'true' })

		// empty feed or disabled
		if (!feed || (!feed.enabled && !allowDisabled)) {
			return yield* Effect.fail(new DatabaseHandler.NotFound())
		}

		return feed
	})

export const getXml = (feed: FeedModel) =>
	Effect.gen(function* () {
		logger.main.verbose(`retrieving feed ${feed.id}`)
		const feedFile = path.join(yield* feedsPath, `${feed.id}.xml`)
		const stats = yield* file.getStats(feedFile)

		return [feedFile, new Date(stats.mtime).getTime()] as [string, number]
	})

export const write = (feed: FeedModel) =>
	Effect.gen(function* () {
		logger.main.info(`Writting feed ${feed.id}.`)

		const baseurl = yield* config.getParam<string>('baseurl')

		const rss = new RSS({
			title: feed.title,
			description: feed.description,
			feed_url: `${baseurl}/feed/${feed.name}`,
			site_url: `${baseurl}`
		})

		const articles = yield* ArticleService.listFeed(feed)
		for (const article of articles) {
			const content = yield* ArticleService.getArticleContent(article).pipe(
				Effect.match({
					onFailure: () => '',
					onSuccess: (content) => content
				})
			)

			if (content === '') {
				logger.main.warn(`Could not read article ${article.uid}`)
				continue
			}

			rss.item({
				title: article.title,
				description: content,
				url: `${baseurl}/article/${article.uid}`,
				author: article.sourceDetails.name,
				date: article.createdAt
			})
		}

		return yield* file.write(
			path.join(yield* feedsPath, `${feed.id}.xml`),
			rss.xml({ indent: false })
		)
	})

export const list = Effect.gen(function* () {
	const timer = metrics.databaseResTimeHist.startTimer()
	const feeds = yield* Effect.tryPromise({
		try: () => FeedModel.findAll(),
		catch: (error) => {
			timer({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'false' })

			return new DatabaseHandler.QueryError(error)
		}
	})

	timer({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'true' })

	return feeds
})

export const setFeed = (feed: FeedModel, value: FeedSchema.setInput['body']) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		feed.name = value.name
		feed.title = value.title
		feed.description = value.description
		feed.enabled = value.enabled

		const updatedFeed = yield* Effect.tryPromise({
			try: () => feed.save(),
			catch: (error) => {
				timer({ operation: 'updateFeed', description: 'Update Feed', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'updateFeed', description: 'Update Feed', success: 'true' })

		return updatedFeed
	})

export const create = (value: FeedSchema.createInput['body']) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const feed = yield* Effect.tryPromise({
			try: () =>
				FeedModel.create({
					name: value.name,
					title: value.title,
					description: value.description,
					enabled: value.enabled
				}),
			catch: (error) => {
				timer({ operation: 'createFeed', description: 'Create Feed', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'createFeed', description: 'Create Feed', success: 'true' })

		return feed
	})

export const remove = (feed: FeedModel) =>
	Effect.gen(function* () {
		if (feed.main) {
			return yield* Effect.fail(new MainFeedError())
		}

		const timer = metrics.databaseResTimeHist.startTimer()
		yield* Effect.tryPromise({
			try: () => feed.destroy(),
			catch: (error) => {
				timer({ operation: 'removeFeed', description: 'Remove Feed', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'removeFeed', description: 'Remove Feed', success: 'true' })

		return yield* Effect.succeed(true)
	})
