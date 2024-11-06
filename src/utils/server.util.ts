import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import moment from 'moment'
import { access as logger } from './logger.util'

const server = express()
server.use(bodyParser.urlencoded({ extended: false }))
server.use(bodyParser.json())
server.use(cookieParser())
server.set('view engine', 'ejs')
server.set('views', path.resolve(__dirname, '../views/'))
server.use(express.static(path.resolve(__dirname, '../../assets/')))

// logging
morgan.token('date', () => moment().format('DD-MM-YYYY HH:mm:ss'))
server.use(
	morgan(':method :url :status :res[content-length] - :response-time ms', {
		stream: {
			write: (message) => logger.http(message.trim())
		}
	})
)

export default server
