import { Data } from 'effect'

export class RssError extends Data.TaggedError('Rss') {
	public readonly title = 'Could not generate rss feed.'
	public readonly code = 'UNEXPECTED'
	public readonly error: unknown
	public readonly message: string
	constructor(error: unknown) {
		super()
		this.error = error
		this.message = 'Unexpected error occured.'
	}
}
