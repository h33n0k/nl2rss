# Newsletter to RSS Converter

nl2rss is a self-hosted tool that lets you convert emails received on an IMAP server into an RSS feed, making it easy to follow incoming messages through any RSS reader. The application is fully Dockerized, allowing for simple deployment and configuration.

It allows users to receive their favorite newsletters directly in their RSS reader, without having to browse through their email.

## Features
- Real Time Conversion
- IMAP Services Support

## Requirements
- An Email Receiving Service (IMAP)
- [Docker](https://docs.docker.com/engine/install/)

## Usage
```bash
# Access Main Feed
>your_baseurl>rss
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

IMAP_USER="<email address>"
IMAP_PASSWORD="<password>"
IMAP_HOST="<imap host>"
```

3. Edit [docker-compose.yaml](/docker-compose.yaml)

4. Build Docker image
```bash
docker compose build
```

5. Run the compose instance
```bash
docker compose up -d
```

## Environment

| Variable   |      Description      |  Default Value |
|----------|---------------|-------|
| `BASE_URL` |  your server base url | `http://localhost` |
| `HTTP_PORT` | Express listening port | `3000` |
| `LOGS_LEVEL` | Logs level | `http` |
| `LOGS_PATH` | Logs path | `/var/log/nl2rss/` |
| `IMAP_RETRIES` | Number of retries in case of connection failed | `3` |
| `IMAP_PORT` | Imap port | `993` |
| `IMAP_TLS` | Imap TLS usage | `true` |
| `IMAP_BOX` | imap listening box | `INBOX` |
| `IMAP_USER` | imap address (user@example.com) | null |
| `IMAP_PASSWORD` | imap user password | null |
| `IMAP_HOST` | imap host (mail.example.com) | null |

## Contributing

If you spot anything that needs a touch-up don't be shy !
Let me know or even whip up a pull request.

If you still have an issue, [open a new issue](https://github.com/h33n0k/nl2rss/issues).

For more information consult [CONTRIBUTING.md](/CONTRIBUTING.md)
