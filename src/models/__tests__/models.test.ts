import * as database from '../../utils/__mocks__/database'
import MailModel from '../mail'

const models = [MailModel]

const sequelize = database.sequelize
beforeAll(async () => {
	await database.init()
	await database.connect()
})

afterAll(async () => {
	await database.disconnect()
})

it('should add models', () => {
	sequelize.addModels(models)
})
