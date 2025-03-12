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
	logs: {
		level: 'info',
		path: '/var/log/nl2rss'
	},
	http: {
		port: '3000'
	}
}
