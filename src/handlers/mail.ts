import { Mail } from '../schemas/mail'
import { Data } from 'effect'

export class IdError extends Data.TaggedError('Id') {
	public readonly title = 'Could not generate mail id.'
	public readonly code = 'UNEXPECTED'
	public readonly error: unknown
	public readonly message: string
	public readonly mail: Mail
	constructor(error: unknown, mail: Mail) {
		super()
		this.error = error
		this.mail = mail
		this.message = 'Unexpected error occured.'
	}
}
