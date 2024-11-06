import { Effect } from 'effect'
import * as database from '../database'
import { FeedModel } from '../../src/models'
import * as service from '../../src/services/feed.service'
import * as metrics from '../../src/utils/metrics.util'
import { faker } from '@faker-js/faker'

jest.mock('../../src/utils/metrics.util')
jest.mock('../../src/utils/logger.util', () => ({
	database: {
		verbose: jest.fn(),
		info: jest.fn(),
		error: jest.fn()
	},
	main: {
		verbose: jest.fn(),
		info: jest.fn(),
		error: jest.fn()
	}
}))

const mockedTimer = jest.fn()

describe('feed service', () => {

	beforeAll(async () => {
		await database.connect()
	})

	beforeEach(async () => {
		await database.init() // reset mocked database before each tests
		jest.clearAllMocks()
		;(metrics.databaseResTimeHist.startTimer as jest.Mock).mockReturnValue(mockedTimer)
	})

	afterAll(async () => {
    await database.disconnect()
	})

	describe('database operations', () => {
		describe('getMain method', () => {
			it('should returns the main feed model', async () => {
				const feed = await FeedModel.findByPk(1)
				feed!.main = true
				await feed!.save()

				const result = await Effect.runPromise(service.getMain)
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(FeedModel)
				expect(result.id).toBe(feed!.id)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchFeed', description: 'Fetch Main Feed', success: 'true' })
			})
			it('should create the main feed model if inexistant', async () => {
				const count = await FeedModel.count()
				const result = await Effect.runPromise(service.getMain)
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(FeedModel)
				expect(result.id).toBe(count + 1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'createFeed', description: 'Create Main Feed', success: 'true' })
			})
		})
		describe('getFeeds method', () => {
			it('should returns array of feed models from given ids', async () => {
				const ids = [...new Array(database.feedsLength).fill(null).map((_, i) => i + 1), database.feedsLength + 1]
				const result = await Effect.runPromise(service.getFeeds(ids))
				expect(result).toBeDefined()
				expect(result.length).not.toBe(0)
				expect(result.length).not.toBeGreaterThan(database.feedsLength)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'true' })
				for (const item of result) {
					expect(item).toBeInstanceOf(FeedModel)
					expect(ids.includes(item.id)).toBeTruthy()
				}
			})
		})
		describe('remove method', () => {
			it('should remove given feed model', async () => {
				const feed = await FeedModel.findByPk(1)
				const result = await Effect.runPromise(service.remove(feed!))
				expect(result).toBeTruthy()
				expect(await FeedModel.count()).toBe(database.feedsLength - 1)
				expect(await FeedModel.findByPk(1)).toBeNull()
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'removeFeed', description: 'Remove Feed', success: 'true' })
			})
			it('should throws an error when given feed is the main one', async () => {
				const feed = await FeedModel.findByPk(1)
				feed!.main = true
				await feed!.save()

				await expect(Effect.runPromise(service.remove(feed!))).rejects.toThrow("Can't delete main feed")
			})
		})
		describe('create method', () => {
			const payload = { title: faker.lorem.sentence(), name: faker.lorem.word(), description: faker.lorem.text(), enabled: true }
			it('should create feed model from paload', async () => {
				const result = await Effect.runPromise(service.create(payload))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(FeedModel)
				expect(result.name).toBe(payload.name)
				expect(await FeedModel.count()).toBe(database.feedsLength + 1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'createFeed', description: 'Create Feed', success: 'true' })
			})
			it('should throws an error when passing duplicate fields', async () => {
				payload.name = (await FeedModel.findByPk(1))!.name
				const result = Effect.runPromise(service.create(payload))
				await expect(result).rejects.toThrow('Database Error.')
			})
		})
		describe('get method', () => {
			it('should return feed model when found by id', async () => {
				const result = await Effect.runPromise(service.get(1, true))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(FeedModel)
				expect(result.id).toBe(1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchFeed', description: 'Fetch Feed', success: 'true' })
			})
			it('should return feed model when found by name', async () => {
				const name = (await FeedModel.findByPk(1))!.name
				const result = await Effect.runPromise(service.get(name, true))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(FeedModel)
				expect(result.id).toBe(1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchFeed', description: 'Fetch Feed', success: 'true' })
			})
			it('should throws an error when found disabled feed model by id', async () => {
				const feed = await FeedModel.findByPk(1)
				feed!.enabled = false
				await feed!.save()

				const result = Effect.runPromise(service.get(1))
				await expect(result).rejects.toThrow('Not Found.')
			})
			it('should throws an error when found disabled feed model by name', async () => {
				const feed = await FeedModel.findByPk(1)
				feed!.enabled = false
				await feed!.save()

				const result = Effect.runPromise(service.get(feed!.name))
				await expect(result).rejects.toThrow('Not Found.')
			})
			it('should throws an error when no feed has been found by id', async () => {
				const result = Effect.runPromise(service.get(99))
				await expect(result).rejects.toThrow('Not Found.')
			})
			it('should throws an error when no feed has been found by name', async () => {
				const result = Effect.runPromise(service.get('invalid-name'))
				await expect(result).rejects.toThrow('Not Found.')
			})
		})
		describe('list method', () => {
			it('should list all feed models', async () => {
				const result = await Effect.runPromise(service.list)
				expect(result).toBeDefined()
				expect(result.length).toBe(database.feedsLength)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchFeeds', description: 'Fetch Feeds', success: 'true' })
			})
		})
	})
})
