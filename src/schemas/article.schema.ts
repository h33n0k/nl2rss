import { coerce, object, TypeOf } from 'zod'

const id = coerce
	.number()
	.int()
	.describe('Article id')
	.refine((value) => value !== undefined, {
		message: 'Article id is required',
		path: ['id']
	})

const uid = coerce
	.string()
	.describe('Article uid')
	.refine((value) => value !== undefined, {
		message: 'Article uid is required',
		path: ['uid']
	})

const hidden = coerce
	.boolean()
	.describe('Article Hidden Status')
	.refine((value) => value !== undefined, {
		message: 'Article Hidden is required'
	})

const payload = object({
	hidden
})

export const set = object({
	params: object({ id }),
	body: payload
})

export const getContent = object({
	params: object({ uid })
})

export type setInput = TypeOf<typeof set>
export type getContentInput = TypeOf<typeof getContent>
