# apps/api — Backend (Node.js / API REST)

API de regras de negócio do Imob Parcerias. Node.js + PostgreSQL (Neon).

## Responsabilidades na Sprint 1
- Autenticação (registro, login, refresh) com JWT.
- Cadastro de corretor + registro do aceite do Termo de Uso (IP/timestamp/user-agent).
- Fluxo administrativo de verificação manual de CRECI (aprovar/rejeitar).
- Migrations do banco (tabelas `corretor`, `termo_aceite`, `usuario_equipe`).
- Envio de e-mail transacional (aprovação/rejeição).

## Scripts esperados
```bash
npm run dev       # ambiente local (http://localhost:4000)
npm run migrate   # aplica migrations no Neon
npm run build
npm run start
```

## Variáveis de ambiente
- `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
- `RESEND_API_KEY`, `CORS_ORIGIN`, `NODE_ENV`

> Consulte `docs/sprint-01-base-e-corretores.md` para o modelo de dados e endpoints.
