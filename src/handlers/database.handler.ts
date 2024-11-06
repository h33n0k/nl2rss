import { Data } from 'effect'
import { UnexpectedErrorResponse, type Json } from '../types/response.type'

export class NotFound extends Data.TaggedError('DatabaseNotFound') {
	public readonly message: string
	public readonly response: Json
	constructor() {
		super()
		this.message = 'Not Found.'
		this.response = {
			status: 404,
			message: 'Not Found.',
			type: 'not_found',
			errors: []
		}
	}
}

export class QueryError extends Data.TaggedError('DatabaseQuery') {
	public readonly message: string
	public readonly response: Json
	public readonly error: unknown
	constructor(error: unknown) {
		super()
		this.error = error
		this.response = UnexpectedErrorResponse
		this.message = 'Database Error.'
	}
}

export class DatabaseAuthError extends Data.TaggedError('DatabaseAuth') {
	public readonly message: string
	constructor(connectionOptions: {
		host: string
		user: string
		password: string
		port: number
		database: string
	}) {
		super()
		const password = new Array(connectionOptions.password.length).fill('*').join('')
		this.message = `Connection Refused to mariadb://${connectionOptions.user}:${password}@${connectionOptions.host}:${connectionOptions.port}/${connectionOptions.database}`
	}
}

export class DatabaseDisconnectError extends Data.TaggedError('DatabaseDisconnect') {
	public readonly message: string
	constructor(error: unknown) {
		super()
		console.log(error)
	}
}

export class DatabaseSyncError extends Data.TaggedError('DatabaseSync') {
	public readonly message: string
	constructor(error: unknown) {
		super()
		console.log(error)
	}
}
