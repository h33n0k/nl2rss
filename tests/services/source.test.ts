import { Effect } from 'effect'
import * as database from '../database'
import { FeedModel, ArticleModel, SourceModel } from '../../src/models'
import * as service from '../../src/services/source.service'
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

describe('source service', () => {

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
			const payload = { name: faker.person.fullName(), address: faker.internet.email() }
			it('should create source model from payload', async () => {
				const result = await Effect.runPromise(service.create(payload.name, payload.address))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(SourceModel)
				expect(result.name).toBe(payload.name)
				expect(await SourceModel.count()).toBe(database.sourcesLength + 1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'createSource', description: 'Save Source', success: 'true' })
			})
			it('should return original source when passing duplicate fields', async () => {
				const original = await SourceModel.findByPk(1)
				payload.address = original!.address
				const result = await Effect.runPromise(service.create(payload.name, payload.address))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(SourceModel)
				expect(result.id).toBe(original!.id)
				expect(await SourceModel.count()).toBe(database.sourcesLength)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchSource', description: 'Fetch Source', success: 'true' })
			})
		})
		describe('get method', () => {
			it('should fetch source from id', async () => {
				const result = await Effect.runPromise(service.get(1))
				expect(result).toBeDefined()
				expect(result).toBeInstanceOf(SourceModel)
				expect(result.id).toBe(1)
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchSource', description: 'Fetch Source', success: 'true' })
			})
			it('should throws an error when no source has been found', async () => {
				const result = Effect.runPromise(service.get(99))
				await expect(result).rejects.toThrow('Not Found.')
				expect(mockedTimer).toHaveBeenCalledWith({ operation: 'fetchSource', description: 'Fetch Source', success: 'true' })
			})
		})
	})
})
