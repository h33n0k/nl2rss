import { Column, ForeignKey, Model as SequelizeModel, Table } from 'sequelize-typescript'
import Feed from './feed.model'
import Source from './source.model'

@Table
export default class SourceFeed extends SequelizeModel<SourceFeed> {
	@ForeignKey(() => Source)
	@Column
	source: number

	@ForeignKey(() => Feed)
	@Column
	feed: number
}
