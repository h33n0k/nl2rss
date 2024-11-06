import { object, string, TypeOf } from 'zod'

export const login = object({
	body: object({
		password: string({
			description: 'password',
			required_error: 'Password is required.'
		})
	})
})

export type Login = TypeOf<typeof login>
