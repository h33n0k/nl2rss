import dotenv from 'dotenv'

dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from 'config'

import logger from './utils/logger'
import * as database from './utils/database'
import * as imap from './utils/imap'

async function main() {
	logger.info('Starting main process.')
	await database.connect()
	await imap.connect()
	await imap.listen()
}

main()
