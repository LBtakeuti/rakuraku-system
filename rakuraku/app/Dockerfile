FROM node:24-alpine

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --network-timeout 120000

COPY . .

EXPOSE 3020

CMD ["pnpm", "dev", "-p", "3020"]
