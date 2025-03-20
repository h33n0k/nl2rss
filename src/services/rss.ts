import path from 'path'
import config from 'config'

import RSS from 'rss'
import { Effect } from 'effect'

import * as FileUtils from '../utils/file'
import * as MailService from './mail'
import * as RssHandler from '../handlers/rss'

export const write = Effect.gen(function* () {
	const mails = yield* MailService.getLatest(config.get<number>('rss.limit'))

	const feed = new RSS({
		title: config.get<string>('rss.title'),
		description: config.get<string>('rss.description'),
		feed_url: `${config.get<string>('http.baseurl')}/rss`,
		site_url: config.get<string>('http.baseurl')
	})

	for (const mail of mails) {
		const content = yield* FileUtils.read(
			path.join(config.get<string>('data.path'), 'mails', mail.file)
		)

		yield* Effect.try({
			try: () => {
				feed.item({
					title: mail.subject,
					description: content,
					url: `${config.get<string>('http.baseurl')}/file/${mail.file}`,
					author: mail.name !== '' ? mail.name : mail.address,
					date: mail.createdAt
				})
			},
			catch: (error) => new RssHandler.RssError(error)
		})
	}

	return yield* FileUtils.write(
		path.join(config.get<string>('data.path'), 'feed.xml'),
		feed.xml({ indent: false })
	)
})
