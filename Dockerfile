FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
  && corepack prepare pnpm@10 --activate \
  && pnpm install --prod --no-frozen-lockfile

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/app.js"]