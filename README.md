# Newsletter to RSS Converter

nl2rss is a self-hosted tool that lets you convert emails received on an IMAP server into an RSS feed, making it easy to follow incoming messages through any RSS reader. The application is fully Dockerized, allowing for simple deployment and configuration.

It allows users to receive their favorite newsletters directly in their RSS reader, without having to browse through their email.

## Features
- Filter Senders Into Multiple Feeds
- Real Time Conversion
- Multi Mail Services Support
- Intuitive Admin Interface
- Customization Options: Filter emails by sender, folders.

## Requirements
- An Email Receiving Service (IMAP)
- [Docker](https://docs.docker.com/engine/install/)

## Usage
```bash
# Access Main Feed
http://<your_domain>/feed/all
# Access Dashboard
http://<your_domain>/dashboard
```

## Installation
1. Clone the repository
```bash
git clone https://github.com/h33n0k/nl2rss.git
cd nl2rss
```
2. Configure Environment Variables
Create a `.env` file or specify these variables directly in your docker environment
```.env
BASE_URL="http://localhost:3000"
PASSWORD="changeme"

MYSQL_USER="app"
MYSQL_DATABASE="nl2rss"
MYSQL_ROOT_PASSWORD="changeme"
MYSQL_PASSWORD="changeme"

IMAP_USER="<email address>"
IMAP_PASSWORD="<password>"
IMAP_HOST="<imap host>"
```

3. Create `JsonWebToken key pairs`
```bash
mkdir jwt
openssl genrsa -out ./jwt/private.key 4096
openssl rsa -in ./jwt/private.key -pubout -outform PEM -out ./jwt/public.key
```

4. Edit [docker-compose.yaml](/docker-compose.yaml)

5. Build Docker image
```bash
docker compose build
```

6. Run the compose instance
```bash
docker compose up -d
```

## Environment

| Variable   |      Description      |  Default Value |
|----------|---------------|-------|
| `BASE_URL` |  your server base url | `http://localhost:3000` |
| `PASSWORD` | Dashboard login password | null |
| `HTTP_PORT` | Express listening port | `3000` |
| `DASHBOARD` | Boolean that is used to show dashboard or not. | `true` |
| `API` | Boolean that is used to allow API access (required if using dashboard) | `true` |
| `LOGS_ENABLED` | Enable or Disable logs | `true` |
| `LOGS_PATH` | Logs path | `/var/log/nl2rss/` |
| `JWT_PRIVATE` | JsonWebToken private key path | `/etc/nl2rss/keys/private.key` |
| `JWT_PUBLIC` | JsonWebToken public key path | `/etc/nl2rss/keys/public.key` |
| `IMAP_RETRIES` | Number of retries in case of connection failed | `3` |
| `IMAP_PORT` | Imap port | `993` |
| `IMAP_TLS` | Imap TLS usage | `true` |
| `IMAP_BOX` | imap listening box | `INBOX` |
| `IMAP_USER` | imap address (user@example.com) | null |
| `IMAP_PASSWORD` | imap user password | null |
| `IMAP_HOST` | imap host (smtp.example.com) | null |
| `MYSQL_HOST` | Database Host | `mariadb` |
| `MYSQL_PORT` | Database listening port | `3306` |
| `MYSQL_DATABASE` | Database name | `nl2rss` |
| `MYSQL_USER` | Database user | `app` |
| `MYSQL_PASSWORD` | Database user password | null |
| `MYSQL_RETRIES` | Number of retries in case of connection failed | `3` |

## Contributing

If you spot anything that needs a touch-up don't be shy !
Let me know or even whip up a pull request.

If you still have an issue, [open a new issue](https://github.com/h33n0k/nl2rss/issues).

For more information consult [CONTRIBUTING.md](/CONTRIBUTING.md)
