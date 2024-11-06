import { coerce, object, TypeOf } from 'zod'

const id = coerce
	.number()
	.int()
	.describe('Feed Id')
	.refine((value) => value !== undefined, {
		message: 'Feed id is required',
		path: ['id']
	})

const name = coerce
	.string()
	.describe('Feed Name')
	.refine((value) => value !== undefined, {
		message: 'Feed name is required'
	})

const title = coerce
	.string()
	.describe('Feed Title')
	.refine((value) => value !== undefined, {
		message: 'Feed title is required'
	})

const description = coerce
	.string()
	.describe('Feed Description')
	.refine((value) => value !== undefined, {
		message: 'Feed description is required'
	})

const enabled = coerce
	.boolean()
	.describe('Feed Enabled Status')
	.refine((value) => value !== undefined, {
		message: 'Feed Enabled is required'
	})

const payload = object({
	name,
	title,
	description,
	enabled
})

export const remove = object({
	params: object({ id })
})

export const set = object({
	params: object({ id }),
	body: payload
})

export const get = object({
	params: object({ name })
})

export const create = object({
	body: payload
})

export type getInput = TypeOf<typeof get>
export type setInput = TypeOf<typeof set>
export type createInput = TypeOf<typeof create>
export type removeInput = TypeOf<typeof remove>
