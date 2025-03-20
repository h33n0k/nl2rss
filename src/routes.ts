import { Express, Response } from 'express'

export default (server: Express) => {
	// Managment
	server.get('/healthcheck', (_, res: Response) => {
		res.sendStatus(200)
	})
}
