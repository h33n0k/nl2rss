export default {
	data: {
		path: '/var/lib/nl2rss'
	},
	imap: {
		box: 'INBOX',
		retries: 3,
		port: 993,
		tls: true
	},
	rss: {
		limit: 10,
		cache_time: 5000,
		title: 'nl2rss feed',
		description: 'Rss feed from mail box.'
	},
	logs: {
		level: 'info',
		path: '/var/log/nl2rss'
	},
	http: {
		port: '3000',
		baseurl: 'http://localhost'
	}
}
