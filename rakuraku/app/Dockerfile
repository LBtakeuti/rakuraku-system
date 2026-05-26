FROM node:24-alpine

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json package-lock.json ./
RUN pnpm import && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3020

CMD ["pnpm", "dev", "-p", "3020"]
