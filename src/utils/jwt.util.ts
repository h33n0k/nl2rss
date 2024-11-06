import { Data, Effect } from 'effect'
import jwt from 'jsonwebtoken'
import * as config from './config.util'
import * as file from './file.util'

export interface AccessToken {
	expire: number
}

class InvalidTokenError extends Data.TaggedError('InvalidToken') {
	public readonly message: string
	constructor(error: unknown) {
		super()
		this.message = 'Could not verify Token.'

		if (error instanceof Error) {
			this.message = error.message
		}
	}
}

class SigningTokenError extends Data.TaggedError('SigningToken') {
	public readonly message: string
	constructor(error: unknown) {
		super()
		this.message = 'Could not generate Token.'

		if (error instanceof Error) {
			this.message = error.message
		}
	}
}

const keys = Effect.gen(function* () {
	const privateKey = yield* config.getParam<string>('jwt.keys.private')
	const publicKey = yield* config.getParam<string>('jwt.keys.public')

	return { privateKey: yield* file.read(privateKey), publicKey: yield* file.read(publicKey) }
})

export const verify = (token: string) =>
	Effect.gen(function* () {
		const { publicKey } = yield* keys
		const decoded = yield* Effect.try({
			try: () => jwt.verify(token, publicKey) as AccessToken,
			catch: (error) => new InvalidTokenError(error)
		})

		return decoded
	})

export const sign = (payload: object) =>
	Effect.gen(function* () {
		const algorithm = yield* config.getParam<jwt.Algorithm>('jwt.algorithm')
		const { privateKey } = yield* keys

		return yield* Effect.try({
			try: () =>
				jwt.sign(payload, privateKey, {
					algorithm
				}),
			catch: (error) => new SigningTokenError(error)
		})
	})
