import config from 'config'
import path from 'path'
import winston, { format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const timestamp = format.timestamp({
	format: 'DD-MM-YYYY HH:mm:ss'
})

const levelFilter = (levels: string[]) =>
	winston.format((info) => (levels.includes(info.level) ? info : false))

const fileTransport = ({
	name,
	filters,
	logPath
}: {
	name: string
	filters: winston.Logform.FormatWrap[]
	logPath: string
}): DailyRotateFile =>
	new DailyRotateFile({
		filename: path.join(config.get<string>('logs.path'), logPath, `${name}-%DATE%.log`),
		format: format.combine(...filters.map((filter) => filter()), timestamp, format.json()),
		datePattern: 'DD-MM-YYYY',
		zippedArchive: true,
		maxSize: '20m',
		maxFiles: '14d'
	})

const logger = ({ name, level }: { name: string; level?: string }) => {
	const transports = []

	transports.push(
		new winston.transports.Console({
			format: format.combine(
				format((info) => {
					info.level = info.level.toUpperCase()

					return info
				})(),
				format.colorize({ all: false, level: true }),
				timestamp,
				format.printf(({ level, message, timestamp, ...metadata }) => {
					return `[${timestamp}] (${metadata.service}) ${level}: ${message}`
				})
			)
		})
	)

	if (config.get<boolean>('logs.enabled')) {
		transports.push(
			fileTransport({
				name: 'info',
				filters: [levelFilter(['info'])],
				logPath: name
			})
		)
		transports.push(
			fileTransport({
				name: 'error',
				filters: [levelFilter(['error', 'warn'])],
				logPath: name
			})
		)

		if (level === 'http') {
			transports.push(
				fileTransport({
					name: 'access',
					filters: [levelFilter(['http'])],
					logPath: name
				})
			)
		}
	}

	return winston.loggers.add(name, {
		defaultMeta: { service: name },
		level: level || process.env.LOG_LEVEL || 'info',
		transports
	})
}

logger({ name: 'main' })
logger({ name: 'database' })
logger({ name: 'imap' })
logger({ name: 'metrics' })
logger({ name: 'access', level: 'http' })

export const main = winston.loggers.get('main')
export const database = winston.loggers.get('database')
export const access = winston.loggers.get('access')
export const metrics = winston.loggers.get('metrics')
export const imap = winston.loggers.get('imap')
