import config from 'config'
import { Data, Effect } from 'effect'

export class UndefinedConfigParamError extends Data.TaggedError('UndefinedConfigParam') {
	public readonly key: string
	public readonly message: string
	constructor(key: string) {
		super()
		this.key = key
		this.message = `Undefined config param ${key}`
	}
}

export const getParam = <K>(key: string) =>
	Effect.gen(function* () {
		if (!config.has(key)) {
			return yield* Effect.fail(new UndefinedConfigParamError(key))
		}

		return yield* Effect.succeed(config.get<K>(key))
	})
