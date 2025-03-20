import config from 'config'

import express from 'express'
import morgan from 'morgan'
import moment from 'moment'

import logger, { timestamp } from './logger'

export const http = express()

// logging
morgan.token('date', () => moment().format(timestamp))
http.use(
	morgan(':method :url :status :res[content-length] - :response-time ms', {
		stream: {
			write: (message) => logger.http(message.trim())
		}
	})
)

export const start = () =>
	new Promise<void>((resolve) => {
		const port = config.get<string>('http.port')
		http.listen(port, () => {
			logger.verbose(`HTTP server listenning on port ${port}`)
			logger.info('HTTP server started.')
			resolve()
		})
	})
