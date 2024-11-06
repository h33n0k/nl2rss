import { Request, Response } from 'express'
import client, { collectDefaultMetrics } from 'prom-client'

collectDefaultMetrics()

export const databaseResTimeHist = new client.Histogram({
	name: 'database_response_time_duration_seconds',
	help: 'database response time in seconds',
	labelNames: ['operation', 'success', 'description']
})

export const requestResTimeHist = new client.Histogram({
	name: 'request_response_time_duration_seconds',
	help: 'request response time in seconds',
	labelNames: ['method', 'path', 'status_code']
})

export const response = async (_: Request, res: Response) => {
	res.set('Content-Type', client.register.contentType)

	return res.send(await client.register.metrics())
}
