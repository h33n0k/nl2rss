export default {
	imap: {
		box: 'INBOX',
		retries: 3,
		port: 993,
		tls: true
	},
	logs: {
		level: 'info',
		path: '/var/log/nl2rss/'
	},
	http: {
		port: '3000'
	}
}
