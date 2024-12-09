import { Data } from 'effect'

export class BoxError extends Data.TaggedError('Box') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown, box: string) {
		super()
		this.message = `Failed to open box '${box}'`
		this.error = error
	}
}

export class UndefinedImapClientError extends Data.TaggedError('UndefinedImapClient') {
	public readonly message: string
	constructor() {
		super()
		this.message = 'The IMAP client has not been initialized.'
	}
}

export class MailParseError extends Data.TaggedError('MailParse') {
	public readonly message: string
	public readonly error: unknown
	constructor(error: unknown) {
		super()
		this.message = 'Failed to parse'
		this.error = error
	}
}

export class ImapFetchError extends Data.TaggedError('ImapFetch') {
	public readonly message: string
	constructor(error: any) {
		super()
		this.message = 'Imap Fetch Failed.'
		console.log(error)
	}
}

export class ImapConnectionError extends Data.TaggedError('ImapConnection') {
	public readonly message: string
	constructor(
		error: any,
		connection: {
			user: string
			password: string
			host: string
			port: number
			tls: boolean
		}
	) {
		super()

		if (error instanceof Error) {
			console.log(error.name)
		}

		const password = new Array(connection.password.length).fill('*').join('')
		this.message = `Connection Refused to ${connection.user}:${password}@${connection.host}:${connection.port} TLS=${connection.tls}`
	}
}
