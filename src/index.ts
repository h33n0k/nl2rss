import dotenv from 'dotenv'

dotenv.config()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from 'config'

import * as imap from './utils/imap'
import logger from './utils/logger'

async function main() {
	logger.verbose('Starting main process.')
	await imap.connect()
	await imap.listen()
}

main()
