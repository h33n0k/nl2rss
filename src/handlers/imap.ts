import Imap from 'imap'
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

export class BoxError extends Data.TaggedError('Box') {
	public readonly error: unknown
	public readonly message: string
	constructor(error: unknown, box: string) {
		super()
		this.message = `Failed to open box '${box}'`
		this.error = error
	}
}

export class ClientError extends Data.TaggedError('Client') {
	public readonly message: string
	constructor(client: Imap) {
		super()
		if (!client) {
			this.message = 'Undefined imap client.'
		}
	}
}

export class FetchError extends Data.TaggedError('Fetch') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown) {
		super()
		this.message = 'Could not fetch mail(s).'
		this.error = error
	}
}

export class ParseError extends Data.TaggedError('Parse') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown) {
		super()
		this.message = 'Could not parse mail.'
		this.error = error
	}
}
