import { faker } from '@faker-js/faker'
import { Sequelize } from 'sequelize-typescript'
import { ArticleModel, SourceModel, SourceFeed, FeedModel } from '../src/models'

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: ':memory:',
	logging: false
})

sequelize.addModels([ArticleModel, SourceModel, SourceFeed, FeedModel])

export const feedsLength = 4
export const sourcesLength = 3
export const articlesLength = 10

const mockedItems = {
	feeds: new Array(feedsLength).fill(null).map(() => () => new FeedModel({
		title: faker.lorem.sentence(),
		name: faker.lorem.word(),
		description: faker.lorem.text()
	})),
	sources: new Array(sourcesLength).fill(null).map(() => () => new SourceModel({
		name: faker.person.fullName(),
		address: faker.internet.email()
	})),
	articles: new Array(articlesLength).fill(null).map(() => () => new ArticleModel({
		uid: faker.string.uuid(),
		title: faker.lorem.sentence(),
		source: Math.floor(Math.random() * sourcesLength) + 1
	}))
}

const init = async () => {
	await sequelize.sync({ force: true })
	for (const list in mockedItems) {
		for (const item of mockedItems[list as keyof typeof mockedItems]) {
			await item().save()
		}
	}
}

const connect = () => sequelize.authenticate()
const disconnect = () => sequelize.close()

export { sequelize, init, connect, disconnect, mockedItems }
