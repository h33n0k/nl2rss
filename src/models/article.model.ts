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
	ForeignKey,
	BelongsTo,
	DataType
} from 'sequelize-typescript'
import SourceModel from './source.model'

@Table({
	tableName: 'articles',
	modelName: 'article',
	timestamps: true
})
export default class Source extends Model<Source, { uid: string; title: string; source: number }> {
	@PrimaryKey
	@AutoIncrement
	@Column
	declare id: number

	@Unique
	@Column
	declare uid: string

	@Column
	declare title: string

	@ForeignKey(() => SourceModel)
	@Column
	declare source: number

	@BelongsTo(() => SourceModel)
	declare sourceDetails: SourceModel

	@Default(false)
	@Column({ type: DataType.BOOLEAN })
	declare hidden: boolean

	@UpdatedAt
	@Column
	declare updatedAt: Date

	@CreatedAt
	@Column
	declare createdAt: Date
}
