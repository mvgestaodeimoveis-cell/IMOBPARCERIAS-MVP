# Setup de Infraestrutura — Ferramentas Gratuitas

Guia do que você precisa provisionar para rodar o MVP em ambiente de **staging**
e **produção** usando os tiers gratuitos. Stack: **Next.js (frontend) + Node.js
(backend) + Neon Postgres (banco)**.

> Recomendação: crie as contas de infraestrutura **no nome/propriedade do cliente**
> (responsabilidade prevista na proposta, seção 6, item 2). Você configura tudo,
> mas a titularidade fica com a empresa dele.

---

## 1. Contas e serviços necessários

| Serviço | Função | Plano gratuito | Custo esperado no MVP |
|---|---|---|---|
| **GitHub** | Repositório + CI/CD | Ilimitado (repos privados) | R$ 0 |
| **Neon** | PostgreSQL serverless | 0,5 GB, projeto free | R$ 0 |
| **Vercel** | Deploy do frontend Next.js | Hobby | R$ 0 |
| **Render** (ou Railway) | Deploy do backend Node.js | Free web service | R$ 0 |
| **Resend** (ou SMTP grátis) | Envio de e-mails transacionais | 3.000 e-mails/mês | R$ 0 |
| **Cloudflare R2** / AWS S3 | Fotos dos imóveis (a partir da Sprint 2) | 10 GB (R2) | ~centavos |
| **Registro.br** | Domínio `.com.br` | — | ~R$ 40/ano |

> **Atenção ao free tier do Render:** o serviço "dorme" após inatividade e demora
> alguns segundos para acordar (cold start). Aceitável em staging; se o chat em
> tempo real (Sprint 3) exigir conexão estável, avalie Railway ou plano pago baixo
> (R$ 0–30/mês, já previsto na proposta).

---

## 2. Passo a passo — Sprint 1

### 2.1 GitHub (repositório)
1. Criar repositório privado `imob-parcerias`.
2. Estrutura monorepo: `apps/web` (Next.js) e `apps/api` (Node.js).
3. Proteger a branch `main`; usar branches `feature/*` e PRs.
4. Adicionar `.gitignore` (node, next, env) e `.env.example`.

### 2.2 Neon (PostgreSQL)
1. Criar conta em https://neon.tech e um projeto `imob-parcerias`.
2. Criar dois branches de banco: `main` (produção) e `staging`.
3. Copiar a **connection string** de cada branch (formato `postgresql://...`).
4. Guardar como variável `DATABASE_URL` (nunca commitar).

### 2.3 Backend Node.js (Render)
1. Criar Web Service apontando para `apps/api`.
2. Build: `npm install && npm run build`; Start: `npm run start`.
3. Variáveis de ambiente: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`,
   `NODE_ENV`, `CORS_ORIGIN`.
4. Rodar as migrations no deploy.

### 2.4 Frontend Next.js (Vercel)
1. Importar o repositório na Vercel, root em `apps/web`.
2. Variáveis: `BACKEND_URL` (URL do backend no Render) — usada server-side pelo BFF.
3. Deploy automático a cada push na `main` (produção) e por PR (preview/staging).

### 2.5 E-mail (Resend)
1. Criar conta, gerar `RESEND_API_KEY`.
2. Verificar um domínio remetente (ou usar sandbox no início).
3. Usado nesta Sprint para notificar aprovação/rejeição de CRECI.

---

## 3. Variáveis de ambiente (`.env.example`)

```bash
# Banco de dados (Neon)
DATABASE_URL=postgresql://user:senha@host/db?sslmode=require

# Autenticação
JWT_SECRET=troque-por-um-segredo-forte
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# E-mail
RESEND_API_KEY=

# App
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

> **Segurança:** nunca commite `.env`. Gere `JWT_SECRET` forte
> (`openssl rand -base64 32`). Habilite `sslmode=require` no Neon.

---

## 4. Ambiente local (para desenvolver)

Pré-requisitos: **Node.js 20 LTS**, **npm** (ou pnpm) e **Git**.

```bash
# clonar
git clone <repo> && cd imob-parcerias

# backend
cd apps/api
cp .env.example .env      # preencher DATABASE_URL do Neon (branch staging)
npm install
npm run migrate           # aplica as migrations
npm run dev               # sobe a API em http://localhost:4000

# frontend (outro terminal)
cd ../web
  cp .env.example .env      # BACKEND_URL=http://localhost:4000
npm install
npm run dev               # sobe o Next em http://localhost:3000
```

Não é obrigatório rodar Postgres localmente: pode usar direto o branch `staging`
do Neon. Se preferir isolamento total, um Postgres via Docker também serve.

---

## 5. Custo total estimado no lançamento

| Item | Custo |
|---|---|
| GitHub, Neon, Vercel, Render, Resend | R$ 0 / mês |
| Backend (se sair do free tier na Sprint 3) | R$ 0–30 / mês |
| Storage de fotos (R2/S3) | centavos / mês |
| Domínio `.com.br` | ~R$ 40 / ano |

**Total prático no MVP: próximo de R$ 0**, exatamente como previsto na proposta.
