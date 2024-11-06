import { Data, Effect } from 'effect'
import { Request, Response, NextFunction } from 'express'
import { Json, UnexpectedErrorResponse } from '../types/response.type'
import { AnyZodObject } from 'zod'

class ValidationError extends Data.TaggedClass('Validation') {
	public readonly errors: object[] = []
	public readonly response: Json
	constructor(error: any) {
		super()
		this.errors = error.errors
		this.response = {
			status: 400,
			message: 'Bad Request.',
			type: 'validation',
			errors: this.errors
		}
	}
}

export default (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) =>
	Effect.gen(function* () {
		const { body, query, params } = yield* Effect.try({
			try: () =>
				schema.parse({
					body: req.body,
					query: req.query,
					params: req.params
				}),
			catch: (error) => new ValidationError(error)
		})

		req.body = body
		req.query = query
		req.params = params

		return yield* Effect.succeed(true)
	}).pipe(
		Effect.catchTags({
			Validation: (error) => Effect.succeed(error.response)
		}),

		Effect.catchAll(() => Effect.succeed(UnexpectedErrorResponse)),
		Effect.andThen((response) => {
			if (typeof response === 'boolean') {
				return next()
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)
