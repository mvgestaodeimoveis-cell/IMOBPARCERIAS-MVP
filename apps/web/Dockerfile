FROM docker.io/library/node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# URL da API embutida no bundle do cliente (browser acessa via host).
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
