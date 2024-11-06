import { array, coerce, object, TypeOf } from 'zod'

const id = coerce
	.number()
	.int()
	.describe('Feed Id')
	.refine((value) => value !== undefined, {
		message: 'Feed id is required',
		path: ['id']
	})

const enabled = coerce
	.boolean()
	.describe('Source Enabled Status')
	.refine((value) => value !== undefined, {
		message: 'Source Enabled is required'
	})

const feeds = array(coerce.number().int().describe('Feed Id'))
	.describe('Feed List')
	.refine((value) => value !== undefined, {
		message: 'Feeds List is required'
	})

const payload = object({
	enabled,
	feeds
})

export const set = object({
	params: object({ id }),
	body: payload
})

export type setInput = TypeOf<typeof set>
