import { Data } from 'effect'

export class ConnectionError extends Data.TaggedError('Connection') {
	public readonly error: unknown
	public readonly message: string
	constructor(
		error: unknown,
		credentials: {
			user: string
			host: string
			port: number
			tls: boolean
		}
	) {
		super()
		this.error = error
		this.message = `Connection refused to ${credentials.user}@${credentials.host}:${credentials.port} (TLS=${credentials.tls})`
	}
}
