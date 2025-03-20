import config from 'config'

import path from 'path'

import { Effect, pipe } from 'effect'
import logger from '../utils/logger'

import { JsonResponse } from '../types/response'
import * as FileUtils from '../utils/file'
import * as RssService from '../services/rss'

import { Request, Response } from 'express'

export const getFeedHandler = (_req: Request, res: Response) =>
	pipe(
		FileUtils.stat(path.join(config.get<string>('data.path'), 'feed.xml')).pipe(
			Effect.matchEffect({
				onSuccess: ({ file, stats }) => {
					const now = new Date().getTime()
					const lastUpdate = new Date(stats.mtime).getTime()
					if (now - lastUpdate < config.get<number>('rss.cache_time')) {
						return Effect.succeed(file)
					}

					return RssService.write
				},
				onFailure: (error) => {
					if (error.code === 'ENOENT') return RssService.write
					return Effect.fail(error)
				}
			}),
			Effect.match({
				onSuccess: (file) => res.status(200).sendFile(file),
				onFailure: (error) => {
					logger.error(`${error.title}, ${error.message}`)

					const response: JsonResponse = {
						status: 500,
						message: error.title,
						errors: [error.message]
					}

					return res.status(response.status).json(response)
				}
			})
		),
		Effect.runPromise
	)
