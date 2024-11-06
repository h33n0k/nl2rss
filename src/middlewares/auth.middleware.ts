import { Data, Effect } from 'effect'
import { Request, Response, NextFunction } from 'express'
import { type Json, UnexpectedErrorResponse } from '../types/response.type'
import { jwt } from '../utils'

export class AuthError extends Data.TaggedError('Auth') {}
export class RedirectError extends Data.TaggedError('Redirect') {}

export default (req: Request, res: Response, next: NextFunction) =>
	Effect.gen(function* () {
		if (req.cookies['accessToken']) {
			yield* jwt.verify(req.cookies['accessToken'])

			return yield* Effect.succeed(() => next())
		}

		if (req.path === '/dashboard') {
			return yield* Effect.succeed(() => res.status(301).redirect('/login'))
		}

		return yield* Effect.fail(new AuthError())
	}).pipe(
		Effect.catchTags({
			InvalidToken: () =>
				Effect.succeed({
					status: 401,
					message: 'Invalid Token',
					type: 'unauthorized',
					errors: []
				} as Json),
			Auth: () =>
				Effect.succeed({
					status: 401,
					message: 'Unauthorized Request',
					type: 'unauthorized',
					errors: []
				} as Json)
		}),
		Effect.catchAll(() => Effect.succeed(UnexpectedErrorResponse)),
		Effect.andThen((response) => {
			if (typeof response === 'function') {
				return response()
			}

			return res.status(response.status).json(response)
		}),
		Effect.runPromise
	)
