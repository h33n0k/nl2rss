import { Data } from 'effect'

export class AccessError extends Data.TaggedError('Access') {
	public readonly title: string
	public readonly file: string
	public readonly error: unknown
	public readonly message: string
	public code:
		| 'EEXIST'
		| 'EACCESS'
		| 'ENOTDIR'
		| 'ENOENT'
		| 'EMFILE'
		| 'ENOSPC'
		| 'EISDIR'
		| 'UNEXPECTED'
	constructor(
		error: unknown,
		file: string,
		opperation: 'MKDIR' | 'ACCESS' | 'WRITE'
	) {
		super()
		this.file = file

		switch (opperation) {
			case 'MKDIR':
			case 'WRITE':
				this.title = `Could not write ${this.file}`
				break
			default:
				this.title = `Could not access ${this.file}`
				break
		}
		this.code = 'UNEXPECTED'
		this.error = error
		this.message = this.parse()
	}

	parse(): string {
		let message = `Unexpected error.`
		if (this.error && typeof this.error === 'object') {
			if ('code' in this.error && typeof this.error.code === 'string') {
				switch (this.error.code) {
					case 'EEXIST':
						message = 'File or directory already exists.'
						this.code = 'EEXIST'
						break
					case 'EACCESS':
						message = 'Permission denied.'
						this.code = 'EACCESS'
						break
					case 'ENOTDIR':
						message = 'A component of the path is not a directory.'
						this.code = 'ENOTDIR'
						break
					case 'ENOENT':
						message = 'No such file or directory.'
						this.code = 'ENOENT'
						break
					case 'EMFILE':
						message = 'File table overflow.'
						this.code = 'EMFILE'
						break
					case 'EISDIR':
						message = 'Target is a directory.'
						this.code = 'EISDIR'
						break
					case 'ENOSPC':
						message = 'No space left on device.'
						this.code = 'ENOSPC'
						break
				}
			}
		}

		return message
	}
}
