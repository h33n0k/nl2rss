import config from 'config'
import path from 'path'
import winston, { format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

export const timestamp = 'DD-MM-YYYY HH:mm:ss'

const logger = winston.createLogger({
	level: config.get<string>('logs.level') || 'info',
	format: format.timestamp({
		format: 'DD-MM-YYYY HH:mm:ss'
	}),
	transports: [
		new winston.transports.Console({
			format: format.combine(
				format((info) => {
					info.level = info.level.toUpperCase()
					return info
				})(),
				format.colorize({ all: false, level: true }),
				format.timestamp({ format: timestamp }),
				format.printf(({ level, message, timestamp }) => {
					return `[${timestamp}] ${level}: ${message}`
				})
			)
		}),
		new DailyRotateFile({
			filename: path.join(config.get<string>('logs.path'), `nl2rss-%DATE%.log`),
			format: format.combine(
				format((info) => {
					info.level = info.level.toUpperCase()
					return info
				})(),
				format.timestamp({ format: timestamp }),
				format.printf(({ level, message, timestamp }) => {
					return `[${timestamp}] ${level}: ${message}`
				})
			),
			datePattern: 'YYYY-MM-DD',
			zippedArchive: true,
			maxSize: '20m'
		})
	]
})

export default logger
