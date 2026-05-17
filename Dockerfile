FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl cmake build-essential git \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
  && corepack prepare pnpm@10 --activate \
  && pnpm install --prod --no-frozen-lockfile

RUN NODE_WHISPER_DIR=$(node -e "const p=require.resolve('nodejs-whisper/package.json');process.stdout.write(require('path').dirname(p));") \
  && mkdir -p "$NODE_WHISPER_DIR/cpp/whisper.cpp/models" \
  && curl -k -L --fail -o "$NODE_WHISPER_DIR/cpp/whisper.cpp/models/ggml-tiny.bin" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin \
  && cmake -S "$NODE_WHISPER_DIR/cpp/whisper.cpp" -B "$NODE_WHISPER_DIR/cpp/whisper.cpp/build" \
  && cmake --build "$NODE_WHISPER_DIR/cpp/whisper.cpp/build" --config Release --target whisper-cli

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/app.js"]