import {
	AutoIncrement,
	Column,
	CreatedAt,
	DeletedAt,
	Model,
	PrimaryKey,
	Table,
	Unique,
	UpdatedAt
} from 'sequelize-typescript'

import { Mail as MailSchema } from '../schemas/mail'
export type Input = Pick<
	MailSchema,
	'name' | 'address' | 'date' | 'subject'
> & { file: string }

@Table({
	tableName: 'mails',
	modelName: 'mail',
	timestamps: true,
	paranoid: true
})
export default class MailModel extends Model<MailModel, Input> {
	@PrimaryKey
	@AutoIncrement
	@Column
	declare id: number

	@Unique
	@Column
	declare file: string

	@Column
	declare name: string

	@Column
	declare address: string

	@Column
	declare subject: string

	@DeletedAt
	@Column
	declare deletedAt: Date

	@UpdatedAt
	@Column
	declare updatedAt: Date

	@CreatedAt
	@Column
	declare createdAt: Date
}
