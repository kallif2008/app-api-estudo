# api-app-estudo

## Rodando com Docker

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Suba API + MongoDB:

```bash
docker compose up --build -d
```

3. Verifique a API:

```bash
curl http://localhost:5000/
```

4. Para acompanhar logs:

```bash
docker compose logs -f api
```

5. Para parar os containers:

```bash
docker compose down
```

## Deploy com container

Este projeto esta pronto para deploy em qualquer plataforma que aceite Docker (Railway, Render, Fly.io, ECS, etc.) com o arquivo `Dockerfile` na raiz.

Variaveis minimas para producao:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `FRONT_END`
- `API_URL`
- `FFMPEG_PATH` (normalmente `/usr/bin/ffmpeg`)

Comando de start em producao:

```bash
node src/app.js
```
