import { Effect, pipe } from 'effect'
import { Request, Response } from 'express'
import { Json, UnexpectedErrorResponse } from '../types/response.type'
import { SourceService } from '../services'
import { SourceModel } from '../models'

export const getSourcesHandler = (_: Request, res: Response) =>
	SourceService.list(true).pipe(
		Effect.catchAll(() => Effect.fail(UnexpectedErrorResponse)),
		Effect.match({
			onSuccess: (sources) =>
				res.status(200).json({
					status: 200,
					data: sources.map((source) => source.toJSON())
				} as Json),
			onFailure: (response) => res.status(response.status).json(response)
		}),
		Effect.runPromise
	)

export const setSourceHandler = (req: Request, res: Response) =>
	pipe(
		SourceService.get(Number(req.params.id)),
		Effect.flatMap((source) => SourceService.set(source, req.body)),
		Effect.catchTags({
			DatabaseNotFound: (error) => Effect.succeed(error.response)
		}),
		Effect.catchAll((error) => Effect.succeed(error.response)),
		Effect.andThen((response) => {
			if (response instanceof SourceModel) {
				return res.sendStatus(200)
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)
