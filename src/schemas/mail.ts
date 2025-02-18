import { coerce, object, TypeOf } from 'zod'

export const schema = object({
	address: coerce
		.string()
		.describe('Sender Address')
		.refine((value) => value !== undefined, {
			message: 'Sender address is missing.',
			path: ['address']
		}),
	name: coerce.string().optional().describe('Sender Name'),
	subject: coerce.string().optional().describe('Mail Subject'),
	date: coerce
		.string()
		.describe('Mail Date')
		.refine((value) => value !== undefined, {
			message: 'Date is missing.',
			path: ['date']
		}),
	html: coerce
		.string()
		.describe('Mail Body')
		.refine((value) => value !== undefined, {
			message: 'Body is missing.',
			path: ['html']
		})
})

export type Mail = TypeOf<typeof schema>
