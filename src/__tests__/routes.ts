import * as server from '../utils/server'
import routes from '../routes'
import request from 'supertest'

jest.mock('../utils/logger')

interface TestRequest {
	route: string
	description: string
	expectStatus?: number
}

const tests: Record<string, TestRequest[]> = (
	[
		{
			route: '/healthcheck',
			description: 'healthcheck should returns status 200',
			expectStatus: 200
		}
	] as TestRequest[]
).reduce(
	(c, a) => {
		if (a.route in c) c[a.route].push(a)
		else c[a.route] = [a]
		return c
	},
	{} as Record<string, TestRequest[]>
)

describe('`./routes`', () => {
	beforeAll(() => {
		routes(server.http)
	})

	for (const route in tests) {
		describe.each(tests[route])(
			'route `' + route + '`',
			({ description, expectStatus }) => {
				it(description, async () => {
					const response = await request(server.http).get(route)
					if (expectStatus) {
						expect(response.status).toEqual(expectStatus)
					}
				})
			}
		)
	}
})
