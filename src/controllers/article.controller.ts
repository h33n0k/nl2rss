import { Effect, pipe } from 'effect'
import { Request, Response } from 'express'
import { UnexpectedErrorResponse, type Json } from '../types/response.type'
import { ArticleSchema } from '../schemas'
import { ArticleService } from '../services'
import { ArticleModel } from '../models'
import { logger } from '../utils'

export const getArticlesHandler = (_: Request, res: Response) =>
	ArticleService.list(true).pipe(
		Effect.catchAll(() => Effect.fail(UnexpectedErrorResponse)),
		Effect.match({
			onSuccess: (articles) =>
				res.status(200).json({
					status: 200,
					data: articles.map((article) => article.toJSON())
				} as Json),
			onFailure: (response) => res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const getArticleHandler = (
	req: Request<ArticleSchema.getContentInput['params']>,
	res: Response
) =>
	pipe(
		ArticleService.get(req.params.uid),
		Effect.flatMap(ArticleService.getPath),
		Effect.catchTags({
			HiddenArticle: (error) => Effect.succeed(error.response),
			InexistentFile: (error) => {
				logger.main.error(error.message)

				return Effect.succeed({
					...error.response,
					status: 500,
					message: 'Article Content Not Found.'
				})
			},
			DatabaseNotFound: () =>
				Effect.succeed({
					status: 404,
					message: 'Article Not Found.',
					type: 'not_found',
					errors: []
				} as Json)
		}),
		Effect.catchAll((error) => {
			logger.main.error(error.message)

			return Effect.fail(UnexpectedErrorResponse)
		}),
		Effect.match({
			onSuccess: (response) => {
				if (typeof response === 'string') {
					return res.status(200).sendFile(response)
				}

				return res.status(response.status).json(response)
			},
			onFailure: (response) => res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const setArticleHandler = (req: Request, res: Response) =>
	pipe(
		ArticleService.get(req.params.id, true),
		Effect.flatMap((article) => ArticleService.set(article, req.body)),
		Effect.catchAll((error) => {
			logger.access.error(error)

			return Effect.fail(error)
		}),
		Effect.catchTags({
			DatabaseNotFound: (error) => Effect.succeed(error.response)
		}),
		Effect.catchAll((error) => Effect.succeed(error.response)),
		Effect.andThen((response) => {
			if (response instanceof ArticleModel) {
				return res.sendStatus(200)
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)
