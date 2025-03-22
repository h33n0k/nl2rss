FROM node:23

RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

ENV HUSKY=false
WORKDIR /app

COPY package.json ./
RUN npm install
COPY . ./

RUN npm run build

CMD ["npm", "start"]
