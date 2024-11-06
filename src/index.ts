import dotenv from 'dotenv'

// load env variables
dotenv.config()

import config from 'config'
import { imap, database, logger, server } from './utils'
import routes from './routes'

async function main() {
	logger.main.verbose('starting main process.')

	await database.connect() // connect to mariadb
	await imap.connect() // connect to imap server
	await imap.listen() // listen for incoming mails

	// start http server
	const port = config.get<number>('http.port')
	server.listen(port, () => {
		logger.main.info(`HTTP Server started on port ${port}`)
		// set http enpoints
		routes(server)
	})
}

main()
