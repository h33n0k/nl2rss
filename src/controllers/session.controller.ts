import { Data, Effect } from 'effect'
import { Request, Response } from 'express'
import { UnexpectedErrorResponse, type Json } from '../types/response.type'
import { config, jwt, logger } from '../utils'
import { LoginSchema } from '../schemas'

class InvalidPasswordError extends Data.TaggedError('InvalidPassword') {}

export const loginHandler = (
	req: Request<unknown, unknown, LoginSchema.Login['body']>,
	res: Response
) =>
	Effect.gen(function* () {
		const password = yield* config.getParam<string>('password')

		if (req.body.password !== password) {
			return yield* Effect.fail(new InvalidPasswordError())
		}

		const token = yield* jwt.sign({
			expire: yield* config.getParam<number>('jwt.expire')
		} as jwt.AccessToken)

		res.cookie('accessToken', token, {
			httpOnly: true,
			sameSite: 'strict',
			secure: yield* config.getParam<boolean>('jwt.secure'),
			maxAge: yield* config.getParam<number>('jwt.expire'),
			path: '/'
		})

		return yield* Effect.succeed({
			status: 200
		} as Json)
	}).pipe(
		Effect.catchTags({
			InvalidPassword: () =>
				Effect.succeed({
					status: 400,
					message: 'Invalid password.',
					type: 'validation',
					errors: []
				} as Json)
		}),
		Effect.catchAll((error) => {
			logger.main.error(error.message)

			return Effect.succeed({ ...UnexpectedErrorResponse, message: error.message })
		}),
		Effect.andThen((response) => res.status(response.status).json(response)),
		Effect.runPromise
	)
