FROM node:23

RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

RUN groupadd -r nl2rss && useradd -r -g nl2rss -m nl2rss

ENV HUSKY=false \
	DATA_PATH=/var/lib/nl2rss \
	LOG_PATH=/var/log/nl2rss \
	HTTP_PORT=3000

RUN mkdir -p $DATA_PATH $LOG_PATH \
	&& chown -R nl2rss:nl2rss $DATA_PATH $LOG_PATH

WORKDIR /app

COPY package.json ./
RUN npm install
COPY . ./

RUN npm run build

USER nl2rss

CMD ["npm", "start"]
