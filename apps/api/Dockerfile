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

# Aplica as migrations (tenta at\u00e9 o banco responder) e sobe a API.
# Funciona tanto no Compose local quanto em provedores (Render + Neon).
CMD ["sh", "-c", "n=0; until node dist/db/migrate.js || [ \"$n\" -ge 30 ]; do n=$((n+1)); echo \"aguardando o banco... ($n)\"; sleep 2; done; node dist/server.js"]
