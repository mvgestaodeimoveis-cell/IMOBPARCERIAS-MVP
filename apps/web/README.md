# apps/web — Frontend (Next.js / PWA)

Interface do usuário do Imob Parcerias. Next.js (React), Mobile-First, PWA.

## Responsabilidades na Sprint 1
- Telas de cadastro, login, perfil em análise/rejeitado e home autenticada (placeholder).
- Área admin para a fila de verificação de CRECI.
- Configuração PWA (`manifest.json`, service worker, ícones).

## Scripts esperados
```bash
npm run dev     # ambiente local (http://localhost:3000)
npm run build   # build de produção
npm run start   # servir build
```

## Variáveis de ambiente
- `BACKEND_URL` — URL interna do backend usada pelo BFF (route handler `app/api/[...path]`).

> Consulte a documentação em `docs/` para o detalhamento de telas e fluxos.
