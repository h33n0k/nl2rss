import FeedModel from './feed.model'
import SourceFeedModel from './sourceFeed.model'
import {
	Table,
	Model,
	PrimaryKey,
	AutoIncrement,
	Column,
	Unique,
	Default,
	UpdatedAt,
	CreatedAt,
	DataType,
	BelongsToMany
} from 'sequelize-typescript'

@Table({
	tableName: 'sources',
	modelName: 'source',
	timestamps: true
})
export default class Source extends Model<Source, { name: string; address: string }> {
	@PrimaryKey
	@AutoIncrement
	@Column
	declare id: number

	@Column
	declare name: string

	@Unique
	@Column
	declare address: string

	@BelongsToMany(() => FeedModel, () => SourceFeedModel)
	declare feeds: FeedModel[]

	@Default(true)
	@Column({ type: DataType.BOOLEAN })
	declare enabled: boolean

	@UpdatedAt
	@Column
	declare updatedAt: Date

	@CreatedAt
	@Column
	declare createdAt: Date
}
