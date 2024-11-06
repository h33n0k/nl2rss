import { Effect } from 'effect'
import * as database from '../database'
import { FeedModel, ArticleModel, SourceModel } from '../../src/models'
import * as service from '../../src/services/article.service'
import * as metrics from '../../src/utils/metrics.util'
import { faker } from '@faker-js/faker'
import { Op } from 'sequelize'

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
		describe('create method', () => {
			const payload = { uid: faker.string.uuid(), title: faker.lorem.sentence() }
			it('should create article model from payload', async () => {
				const source = await SourceModel.findByPk(1)
				const result = await Effect.runPromise(service.create(payload.uid, payload.title, source!))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(ArticleModel)
				expect(result.uid).toBe(payload.uid)
				expect(await ArticleModel.count()).toBe(database.articlesLength + 1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'createArticle', description: 'Save Article', success: 'true' })
			})
			it('should return original article when passing duplicate fields', async () => {
				const source = await SourceModel.findByPk(1)
				const original = await ArticleModel.findByPk(1)
				payload.uid = original!.uid
				const result = await Effect.runPromise(service.create(payload.uid, payload.title, source!))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(ArticleModel)
				expect(result.id).toBe(original!.id)
				expect(await ArticleModel.count()).toBe(database.articlesLength)
				expect(mockedTimer).not.toHaveBeenCalledWith({ operation: 'createArticle', description: 'Save Article', success: 'true' })
			})
		})
		describe('get method', () => {
			it('should return article model when found by id', async () => {
				const result = await Effect.runPromise(service.get(1, true))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(ArticleModel)
				expect(result.id).toBe(1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'getArticle', description: 'Fetch Article', success: 'true' })
			})
			it('should return article model when found by uid', async () => {
				const uid = (await ArticleModel.findByPk(1))!.uid
				const result = await Effect.runPromise(service.get(uid, true))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(ArticleModel)
				expect(result.id).toBe(1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'getArticle', description: 'Fetch Article', success: 'true' })
			})
			it('should throws an error when found hidden article model by id', async () => {
				const article = await ArticleModel.findByPk(1)
				article!.hidden = true
				await article!.save()

				const result = Effect.runPromise(service.get(1))
				await expect(result).rejects.toThrow(`Unable to retreive article ${article!.uid}`)
			})
			it('should throws an error when found hidden article model by uid', async () => {
				const article = await ArticleModel.findByPk(1)
				article!.hidden = true
				await article!.save()

				const result = Effect.runPromise(service.get(article!.uid))
				await expect(result).rejects.toThrow(`Unable to retreive article ${article!.uid}`)
			})
			it('should throws an error when no article has been found by id', async () => {
				const result = Effect.runPromise(service.get(99))
				await expect(result).rejects.toThrow('Not Found.')
			})
			it('should throws an error when no article has been found by uid', async () => {
				const result = Effect.runPromise(service.get('invalid-uid'))
				await expect(result).rejects.toThrow('Not Found.')
			})
		})
		describe('list method', () => {
			it('should lists all article models', async () => {
				const result = await Effect.runPromise(service.list(true))
				expect(result).toBeDefined()
				expect(result.length).toBe(database.articlesLength)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchArticles', description: 'Fetch Articles', success: 'true' })
				for (const item of result) {
					expect(item).toBeDefined()
					expect(item).toBeInstanceOf(ArticleModel)
				}
			})
			it('should lists all non hidden article models', async () => {
				const article = await ArticleModel.findByPk(1)
				article!.hidden = true
				await article!.save()

				const result = await Effect.runPromise(service.list())
				expect(result).toBeDefined()
				expect(result.length).toBe(database.articlesLength - 1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchArticles', description: 'Fetch Articles', success: 'true' })
				for (const item of result) {
					expect(item).toBeDefined()
					expect(item).toBeInstanceOf(ArticleModel)
					expect(item.hidden).toBeFalsy()
				}
			})
		})
		describe('set method', () => {
			const payload = { hidden: true }
			it('should updates the given article', async () => {
				const article = await ArticleModel.findByPk(1)
				const result = await Effect.runPromise(service.set(article!, payload))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(ArticleModel)
				expect(result.hidden).toBe(payload.hidden)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'updateArticle', description: 'Update Articles', success: 'true' })
			})
		})
		describe('listFeed method', () => {
			const selectedSources = [1, 2]
			it('should list all articles from sources relative to given feed', async () => {
				const feed = await FeedModel.findByPk(1)
				const sources = await SourceModel.findAll({ where: { id: { [Op.in]: selectedSources } } })
				for (const source of sources) {
					source.$set('feeds', [feed!])
					await source.save()
				}

				const articles = await ArticleModel.findAll({ where: { source: { [Op.in]: selectedSources } } })

				const result  = await Effect.runPromise(service.listFeed(feed!, true))
				expect(result).toBeDefined()
				expect(result.length).toBe(articles.length)
				for (const item of result) {
					expect(item).toBeDefined()
					expect(item).toBeInstanceOf(ArticleModel)
					expect(selectedSources.includes(item.source)).toBeTruthy()
				}
			})
			it('should list all non hidden articles from sources relative to given feed', async () => {
				const feed = await FeedModel.findByPk(1)
				const sources = await SourceModel.findAll({ where: { id: { [Op.in]: selectedSources } } })
				for (const source of sources) {
					source.$set('feeds', [feed!])
					await source.save()
				}

				const articles = await ArticleModel.findAll({ where: { source: { [Op.in]: selectedSources } } })

				const result  = await Effect.runPromise(service.listFeed(feed!))
				expect(result).toBeDefined()
				expect(result.length).toBe(articles.length)
				for (const item of result) {
					expect(item).toBeDefined()
					expect(item).toBeInstanceOf(ArticleModel)
					expect(selectedSources.includes(item.source)).toBeTruthy()
					expect(item.hidden).toBeFalsy()
				}
			})
		})
	})
})
