# Deploy — Vercel (frontend) e Render (backend)

Passo a passo para configurar o deploy do monorepo **nas contas da empresa** (Vercel e
Render). As **contas são criadas pela empresa** (ver `contas-e-acessos.md`); o
desenvolvedor executa a configuração abaixo usando o **acesso compartilhado**.
O frontend (`apps/web`) vai na **Vercel** e a API (`apps/api`) no **Render**.

## Pré-requisitos
- Ser colaborador do repositório `mvgestaodeimoveis-cell/IMOBPARCERIAS-MVP`.
- Ter o **login (acesso compartilhado)** das contas Vercel e Render da empresa.
- Banco **Neon** criado → ter a `DATABASE_URL` (com `?sslmode=require`).
- (Opcional) `RESEND_API_KEY` para e-mails reais.
- Gerar um segredo JWT forte: `openssl rand -base64 32`.

## Ordem recomendada
1. **Render (backend)** primeiro → gera a URL da API.
2. **Vercel (frontend)** → aponta para a URL da API.
3. Voltar no Render e preencher `CORS_ORIGIN` / `APP_WEB_URL` com a URL do frontend.

---

## A) Render — backend (API)

1. Acesse **https://render.com** → **Get Started** → **Sign in with GitHub** (autoriza o Render).
2. No painel: **New +** → **Web Service**.
3. **Connect a repository** → escolha `IMOBPARCERIAS-MVP`.
   - Se não aparecer, clique em **Configure account** e dê acesso ao repositório
     (na org `mvgestaodeimoveis-cell` — pode exigir aprovação de um *owner* da org).
4. Configurações do serviço:
   - **Name:** `imobparcerias-api`
   - **Branch:** `main`
   - **Root Directory:** `apps/api`
   - **Runtime:** **Docker** (ele detecta o `Dockerfile` em `apps/api`)
   - **Instance Type:** **Free**
5. **Environment Variables** (adicione uma a uma):
   | Chave | Valor |
   |---|---|
   | `DATABASE_URL` | connection string do Neon (`...?sslmode=require`) |
   | `JWT_SECRET` | segredo forte (`openssl rand -base64 32`) |
   | `JWT_EXPIRES_IN` | `15m` |
   | `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `TERMO_VERSAO` | `2026-07-01` |
   | `CORS_ORIGIN` | deixe temporariamente `http://localhost:3000` (ajusta no passo C) |
   | `APP_WEB_URL` | idem (ajusta no passo C) |
   | `RESEND_API_KEY` | sua chave do Resend (ou deixe vazio → e-mails vão para o log) |
   | `EMAIL_FROM` | `Imob Parcerias <no-reply@imobparcerias.com.br>` |

   > **Não defina `PORT`** — o Render injeta a porta automaticamente e a API já lê `process.env.PORT`.
6. **Health Check Path:** `/health` (em Settings, se quiser habilitar).
7. **Create Web Service** → aguarde o build Docker. No start, o container **roda as migrations
   sozinho** e sobe a API.
8. Copie a URL pública, algo como **`https://imobparcerias-api.onrender.com`**.

### Criar o admin (equipe) — uma vez
Rode o seed **da sua máquina apontando para o Neon** (mais simples que o shell do Render):

```bash
DATABASE_URL="<connection-string-do-neon>" \
ADMIN_NOME="Seu Nome" \
ADMIN_EMAIL="equipe@imobparcerias.com.br" \
ADMIN_SENHA="umaSenhaForte" \
npm run seed:admin -w apps/api
```

---

## B) Vercel — frontend (site)

1. Acesse **https://vercel.com** → **Continue with GitHub**.
2. **Add New...** → **Project** → **Import** o repositório `IMOBPARCERIAS-MVP`.
   - Autorize o **Vercel GitHub App** no repositório/organização, se solicitado.
3. **Configure Project:**
   - **Root Directory:** clique em **Edit** e selecione **`apps/web`**.
   - **Framework Preset:** Next.js (detectado automaticamente).
   - Build/Output: manter o padrão.
4. **Environment Variables:**
   | Chave | Valor |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | a URL do Render (ex.: `https://imobparcerias-api.onrender.com`) |
5. **Deploy**. A Vercel gera uma URL, ex.: **`https://imobparcerias-mvp.vercel.app`**.

---

## C) Fechar o laço (CORS)

1. Volte no **Render** → **Environment** e ajuste:
   - `CORS_ORIGIN` = `https://<sua-url-da-vercel>`
   - `APP_WEB_URL` = `https://<sua-url-da-vercel>`
2. Salve → o Render faz **redeploy automático**. Pronto: front e back conversando.

---

## D) Domínio (Cloudflare) — quando quiser

1. **Vercel** → Project → **Settings → Domains** → adicione `imobparcerias.com.br`
   (a Vercel mostra os registros → adicione no **Cloudflare**).
2. **Render** → Settings → **Custom Domain** → `api.imobparcerias.com.br`
   (adicione o CNAME no Cloudflare).
3. Atualize `NEXT_PUBLIC_API_URL` (Vercel) e `CORS_ORIGIN`/`APP_WEB_URL` (Render) para os domínios finais.

---

## Observações
- **Deploy automático:** todo `git push` na `main` redeploya nos dois serviços.
- **Free tier do Render "dorme"** após ~15 min sem uso → a 1ª requisição depois disso
  demora alguns segundos (cold start). Normal no gratuito.
- O `Dockerfile` da API já aplica as migrations no start e é compatível com Neon.
