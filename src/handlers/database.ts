import { Data } from 'effect'
import {
	ValidationError,
	TimeoutError,
	ConnectionRefusedError,
	AccessDeniedError,
	DatabaseError,
	UniqueConstraintError
} from 'sequelize'

export class AuthError extends Data.TaggedError('Auth') {
	public readonly title = 'Could not Authenticate to the Database'
	public readonly error: unknown
	public readonly message: string
	public code: 'ACCESS' | 'VALIDATION' | 'REFUSED' | 'TIMEOUT' | 'UNEXPECTED'
	constructor(error: unknown) {
		super()
		this.error = error
		this.code = 'UNEXPECTED'
		this.message = this.parse()
	}

	parse(): string {
		const message = 'Unexpected error.'
		if (this.error) {
			switch (true) {
				case this.error instanceof AccessDeniedError:
					this.code = 'ACCESS'
					return 'Invalid credentials or insufficient permissions for database authentication.'
				case this.error instanceof TimeoutError:
					this.code = 'TIMEOUT'
					return 'The database did not respond in time during authentication.'
				case this.error instanceof ConnectionRefusedError:
					this.code = 'REFUSED'
					return 'Could not establish a connection to the database. Ensure the database file is accessible.'
				case this.error instanceof ValidationError:
					this.code = 'VALIDATION'
					return 'The authentication input values failed validation. Check your configuration.'
			}

			if (this.error instanceof Error) {
				return this.error.message
			}
		}

		return message
	}
}

export class SyncError extends Data.TaggedError('Auth') {
	public readonly title = 'Could not Synchronise from the Database'
	public readonly error: unknown
	public readonly message: string
	public code:
		| 'ACCESS'
		| 'VALIDATION'
		| 'REFUSED'
		| 'TIMEOUT'
		| 'DATABASE'
		| 'UNEXPECTED'
	constructor(error: unknown) {
		super()
		this.error = error
		this.code = 'UNEXPECTED'
		this.message = this.parse()
	}

	parse(): string {
		const message = 'Unexpected error.'
		if (this.error) {
			switch (true) {
				case this.error instanceof AccessDeniedError:
					this.code = 'ACCESS'
					return 'Invalid credentials or insufficient permissions for database authentication.'
				case this.error instanceof TimeoutError:
					this.code = 'TIMEOUT'
					return 'The database synchronization process timed out.'
				case this.error instanceof ConnectionRefusedError:
					this.code = 'REFUSED'
					return 'Could not connect to the database during synchronization. Ensure the file is accessible.'
				case this.error instanceof DatabaseError:
					this.code = 'DATABASE'
					return 'An internal database error occurred during synchronization.'
				case this.error instanceof ValidationError:
					this.code = 'VALIDATION'
					return 'The database schema contains invalid values preventing synchronization.'
			}

			if (this.error instanceof Error) {
				return this.error.message
			}
		}

		return message
	}
}

export class ModelError extends Data.TaggedError('Model') {
	public readonly title = 'Could not add Model'
	public readonly error: unknown
	public readonly message = 'Could not implement sequelize model.'
	constructor(error: unknown) {
		super()
		this.error = error
	}
}

export class QueryError extends Data.TaggedError('Query') {
	public readonly title = 'Could not perform database query'
	public readonly error: unknown
	public code: 'UNEXPECTED' | 'CONSTRAINT' | 'VALIDATION' | 'CONNECTION'
	public message: string
	constructor(error: unknown) {
		super()
		this.code = 'UNEXPECTED'
		this.error = error
		this.message = this.parse()
	}

	parse() {
		if (this.error) {
			if (
				this.error instanceof UniqueConstraintError ||
				this.error instanceof ValidationError
			) {
				const details = Object.fromEntries(
					this.error.errors.map((e) => [e.path ?? 'unknown', e.message])
				)

				if (this.error instanceof UniqueConstraintError) {
					this.code = 'CONSTRAINT'
					return `Unique constraint violation on fields: ${Object.keys(details).join(', ')}`
				} else {
					this.code = 'VALIDATION'
					return `Validation failed on fields: ${Object.keys(details).join(', ')}`
				}
			} else {
				switch (true) {
					case this.error instanceof DatabaseError:
						this.code = 'CONNECTION'
						return `Database error: ${this.error.message}`
					case this.error instanceof Error:
						this.code = 'UNEXPECTED'
						return `Unexpected error: ${this.error.message}`
				}
			}
		}

		return 'Unknown database error occurred'
	}
}
