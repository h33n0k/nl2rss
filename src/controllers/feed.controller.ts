import { Effect, pipe } from 'effect'
import { Request, Response } from 'express'
import { Json, UnexpectedErrorResponse } from '../types/response.type'
import { FeedSchema } from '../schemas'
import { FeedService } from '../services'
import { logger } from '../utils'
import { FeedModel } from '../models'

export const getRssFeedHandler = (req: Request<FeedSchema.getInput['params']>, res: Response) =>
	pipe(
		FeedService.get(req.params.name),
		Effect.flatMap((feed) =>
			pipe(
				FeedService.getXml(feed),
				Effect.flatMap(([file, lastUpdate]) => {
					const now = Date.now()

					if (now - lastUpdate <= 1000 * 60 * 10) {
						return Effect.succeed(file)
					}

					return Effect.fail('File outdated.')
				}),
				Effect.catchAll(() => FeedService.write(feed))
			)
		),
		Effect.catchTags({
			DatabaseNotFound: (error) => Effect.succeed({ ...error.response, message: 'Feed Not Found.' })
		}),
		Effect.catchAll((error) => {
			logger.main.error(error)

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

export const getFeedsHandler = (_: Request, res: Response) =>
	FeedService.list.pipe(
		Effect.catchAll(() => Effect.fail(UnexpectedErrorResponse)),
		Effect.match({
			onSuccess: (feeds) =>
				res.status(200).json({
					status: 200,
					data: feeds.map((feed) => feed.toJSON())
				} as Json),
			onFailure: (response) => res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const setFeedHandler = (req: Request, res: Response) =>
	FeedService.get(req.params.id, true).pipe(
		Effect.flatMap((feed) => FeedService.setFeed(feed, req.body as FeedSchema.setInput['body'])),
		Effect.catchTags({
			DatabaseNotFound: (error) => Effect.succeed(error.response)
		}),
		Effect.catchAll(() => Effect.succeed(UnexpectedErrorResponse)),
		Effect.andThen((response) => {
			if (response instanceof FeedModel) {
				return res.sendStatus(200)
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const createFeedHandler = (
	req: Request<unknown, unknown, FeedSchema.createInput['body']>,
	res: Response
) =>
	FeedService.create(req.body).pipe(
		Effect.catchAll((error) =>
			Effect.succeed({ ...UnexpectedErrorResponse, message: error.message })
		),
		Effect.andThen((response) => {
			if (response instanceof FeedModel) {
				return res.sendStatus(200)
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const removeFeedHandler = (req: Request, res: Response) =>
	pipe(
		FeedService.get(req.params.id, true),
		Effect.flatMap((feed) => FeedService.remove(feed)),
		Effect.catchTags({
			MainFeed: (error) => Effect.succeed(error.response),
			DatabaseNotFound: (error) => Effect.succeed(error.response)
		}),
		Effect.catchAll((error) =>
			Effect.succeed({ ...UnexpectedErrorResponse, message: error.message })
		),
		Effect.andThen((response) => {
			if (typeof response === 'boolean') {
				res.sendStatus(200)

				return
			}

			res.status(response.status).json(response)
		}),
		Effect.runPromise
	)
