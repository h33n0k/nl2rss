export interface Json {
	status: number
	message?: string
	type?: 'unexpected' | 'not_found' | 'validation' | 'unauthorized' | 'forbidden'
	data?: unknown
	errors?: any[]
}

export const UnexpectedErrorResponse: Json = {
	status: 500,
	message: 'Unexpected Error.',
	type: 'unexpected',
	errors: []
}
