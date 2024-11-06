import { Data } from 'effect'
import { UnexpectedErrorResponse, type Json } from '../types/response.type'

export class InexistentFileError extends Data.TaggedError('InexistentFile') {
	public readonly message: string
	public readonly response: Json
	constructor(file: string) {
		super()
		this.message = `Not Found. ${file}`
		this.response = {
			status: 404,
			message: 'Not Found.',
			type: 'not_found',
			errors: []
		}
	}
}

export class FileError extends Data.TaggedError('File') {
	public readonly message: string
	public readonly response: Json
	constructor(error: unknown) {
		super()
		console.log(error)
		this.response = UnexpectedErrorResponse
		this.message = 'File Error'
	}
}
