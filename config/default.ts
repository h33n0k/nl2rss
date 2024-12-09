export default {
	baseurl: 'http://localhost:3000',
	content: {
		path: '/data/nl2rss/'
	},
	http: {
		port: 3000,
		dashboard: true,
		api: true
	},
	logs: {
		enabled: true,
		path: '/var/log/nl2rss/'
	},
	jwt: {
		secure: false,
		algorithm: 'RS256',
		expire: 1000 * 60 * 30,
		keys: {
			private: '/etc/nl2rss/keys/private.key',
			public: '/etc/nl2rss/keys/public.key'
		}
	},
	imap: {
		retries: 3,
		port: 993,
		tls: true,
		box: 'INBOX'
	},
	database: {
		host: 'localhost',
		user: 'app',
		database: 'nl2rss',
		port: 3306,
		retries: 3
	}
}
