import config from 'config'
import { Data, Effect, pipe } from 'effect'
import { ArticleModel, FeedModel, SourceModel } from '../models'
import { DatabaseHandler } from '../handlers'
import { logger, metrics } from '../utils'
import * as file from '../utils/file.util'
import path from 'path'
import { Op } from 'sequelize'
import * as SourceService from './source.service'
import { ArticleSchema } from '../schemas'
import { Json } from '../types/response.type'

export class HiddenArticleError extends Data.TaggedError('HiddenArticle') {
	public readonly message: string
	public readonly response: Json
	constructor(article: ArticleModel) {
		super()
		this.message = `Unable to retreive article ${article.uid}`
		this.response = {
			status: 403,
			type: 'forbidden',
			message: this.message,
			errors: []
		}
	}
}

const articlesPath = file.checkDir(path.join(config.get<string>('content.path'), 'articles/')).pipe(
	Effect.catchAll((error) => {
		logger.main.error(error.message)

		return Effect.fail(error)
	})
)

export const create = (uid: string, title: string, source: SourceModel) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const [article, created] = yield* Effect.tryPromise({
			try: () =>
				ArticleModel.findOrCreate({
					where: { uid },
					defaults: { uid, title, source: source.id }
				}),
			catch: (error) => {
				timer({ operation: 'createArticle', description: 'Save Article', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		if (created) {
			timer({ operation: 'createArticle', description: 'Save Article', success: 'true' })
			logger.database.info(`Saved article into database. (${uid})`)
		}

		return article
	})

export const write = (uid: string, html: string) =>
	Effect.gen(function* () {
		const article = path.join(yield* articlesPath, `${uid}.html`)

		if (
			yield* file.exists(article).pipe(
				Effect.match({
					onSuccess: () => false,
					onFailure: () => true
				})
			)
		) {
			yield* file.write(article, html)
		}

		return article
	})

export const get = (identifier: string | number, allowHidden = false) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const article = yield* Effect.tryPromise({
			try: () =>
				ArticleModel.findOne({
					include: {
						model: SourceModel,
						required: true
					},
					where: {
						...(typeof identifier === 'number' ? { id: identifier } : { uid: identifier })
					}
				}),
			catch: (error) => {
				timer({ operation: 'getArticle', description: 'Fetch Article', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'getArticle', description: 'Fetch Article', success: 'true' })

		if (!article) {
			return yield* Effect.fail(new DatabaseHandler.NotFound())
		}

		if (article.hidden && !allowHidden) {
			return yield* Effect.fail(new HiddenArticleError(article))
		}

		return article
	})

export const getPath = (article: ArticleModel) =>
	Effect.gen(function* () {
		logger.main.verbose(`looking for article ${article.uid}`)
		const articlePath = path.join(yield* articlesPath, `${article.uid}.html`)
		yield* file.exists(articlePath)

		return articlePath
	})

export const getArticleContent = (article: ArticleModel) =>
	Effect.gen(function* () {
		const articlePath = yield* getPath(article)

		return yield* file.read(articlePath)
	})

export const listFeed = (feed: FeedModel, allowHidden = false) =>
	pipe(
		SourceService.list(false, feed),
		Effect.map((sources) => sources.map((source) => source.id)),
		Effect.andThen((sources) =>
			Effect.gen(function* () {
				const timer = metrics.databaseResTimeHist.startTimer()
				const articles = yield* Effect.tryPromise({
					try: () =>
						ArticleModel.findAll({
							include: {
								model: SourceModel,
								required: true
							},
							where: {
								[Op.or]: [{ hidden: false }, { hidden: allowHidden }],
								source: {
									[Op.in]: sources
								}
							}
						}),
					catch: (error) => {
						timer({
							operation: 'getSourceArticles',
							description: 'Fetch Source Articles',
							success: 'false'
						})

						return new DatabaseHandler.QueryError(error)
					}
				})

				timer({
					operation: 'getSourceArticles',
					description: 'Fetch Source Articles',
					success: 'true'
				})

				return articles
			})
		)
	)

export const list = (allowHidden = false) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()
		const articles = yield* Effect.tryPromise({
			try: () =>
				ArticleModel.findAll({
					where: {
						[Op.or]: [{ hidden: false }, { hidden: allowHidden }]
					}
				}),
			catch: (error) => {
				timer({ operation: 'fetchArticles', description: 'Fetch Articles', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'fetchArticles', description: 'Fetch Articles', success: 'true' })

		return articles
	})

export const set = (article: ArticleModel, payload: ArticleSchema.setInput['body']) =>
	Effect.gen(function* () {
		const timer = metrics.databaseResTimeHist.startTimer()

		article.hidden = payload.hidden

		const updatedArticle = yield* Effect.tryPromise({
			try: () => article.save(),
			catch: (error) => {
				timer({ operation: 'updateArticle', description: 'Update Article', success: 'false' })

				return new DatabaseHandler.QueryError(error)
			}
		})

		timer({ operation: 'updateArticle', description: 'Update Articles', success: 'true' })

		return updatedArticle
	})
