export default {
	baseurl: 'BASE_URL',
	password: 'PASSWORD',
	content: {
		path: 'CONTENT_PATH'
	},
	http: {
		port: 'HTTP_PORT',
		dashboard: 'DASHBOARD',
		api: 'API'
	},
	logs: {
		enabled: 'LOGS_ENABLED',
		path: 'LOGS_PATH'
	},
	jwt: {
		secure: 'JWT_SECURE',
		keys: {
			private: 'JWT_PRIVATE',
			public: 'JWT_PUBLIC'
		}
	},
	imap: {
		retries: 'IMAP_RETRIES',
		user: 'IMAP_USER',
		password: 'IMAP_PASSWORD',
		host: 'IMAP_HOST',
		port: 'IMAP_PORT',
		tls: 'IMAP_TLS',
		box: 'IMAP_BOX'
	},
	database: {
		host: 'MYSQL_HOST',
		port: 'MYSQL_PORT',
		database: 'MYSQL_DATABASE',
		user: 'MYSQL_USER',
		password: 'MYSQL_PASSWORD',
		retries: 'MYSQL_RETRIES'
	}
}
