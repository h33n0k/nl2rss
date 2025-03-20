import { Express, Response } from 'express'

import * as RssController from './controllers/rss'

export default (server: Express) => {
	// Managment
	server.get('/healthcheck', (_, res: Response) => res.sendStatus(200))

	// Feed
	server.get('/rss', RssController.getFeedHandler)
}
