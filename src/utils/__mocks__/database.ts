import { Sequelize } from 'sequelize-typescript'

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: ':memory:',
	logging: false
})

const init = async () => {
	await sequelize.sync({ force: true })
}

const connect = () => sequelize.authenticate()
const disconnect = () => sequelize.close()

export { sequelize, init, connect, disconnect }
