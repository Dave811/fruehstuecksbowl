# Stage 1: Build (Bun, da Projekt bun.lock nutzt)
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Stage 2: Serve mit Nginx (Env zur Laufzeit via entrypoint)
FROM nginx:alpine

RUN apk add --no-cache nodejs

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.js /entrypoint.js

EXPOSE 80

ENTRYPOINT ["node", "/entrypoint.js"]
