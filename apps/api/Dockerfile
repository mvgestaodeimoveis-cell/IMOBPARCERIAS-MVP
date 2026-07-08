FROM docker.io/library/node:20-alpine

WORKDIR /app

# Dependências (usa o package.json próprio do app — build independente do workspace)
COPY package.json ./
RUN npm install

# Código e build
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

EXPOSE 4000

# Espera o Postgres, aplica migrations e sobe a API.
CMD ["sh", "-c", "until node -e \"require('net').connect(5432,'db').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))\" 2>/dev/null; do echo 'aguardando o banco...'; sleep 1; done; node dist/db/migrate.js && node dist/server.js"]
