// Load environment
import dotenv from 'dotenv'
dotenv.config()
import 'config'

import logger from './utils/logger'
import * as database from './utils/database'
import * as imap from './utils/imap'
import * as server from './utils/server'
import routes from './routes'

async function main() {
	logger.info('Starting main process.')
	await database.connect()

	routes(server.http)
	await server.start()

	await imap.connect()
	await imap.listen()
}

main()
