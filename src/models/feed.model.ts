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
	AllowNull
} from 'sequelize-typescript'

@Table({
	tableName: 'feeds',
	modelName: 'feed',
	timestamps: true
})
export default class Feed extends Model<
	Feed,
	{ name: string; title: string; description: string; main?: boolean; enabled?: boolean }
> {
	@PrimaryKey
	@AutoIncrement
	@Column
	declare id: number

	@Default(false)
	@Column
	declare main: boolean

	@Unique
	@AllowNull(false)
	@Column({
		type: DataType.STRING,
		allowNull: false
	})
	declare name: string

	@Column
	declare title: string

	@Column({ type: DataType.TEXT })
	declare description: string

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
