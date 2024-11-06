import { Schema } from '@effect/schema'

export const schema = Schema.Struct({
	uid: Schema.String,
	address: Schema.String,
	name: Schema.String,
	subject: Schema.String,
	date: Schema.Date,
	html: Schema.String
})

export type Mail = Schema.Schema.Type<typeof schema>
