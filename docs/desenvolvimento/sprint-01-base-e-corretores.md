# Sprint 1 — Base e Corretores (Dias 1 a 7)

> Objetivo da Sprint: entregar a **fundação técnica** do projeto (infra, repositórios,
> CI/CD básico) e o **módulo completo de corretores**: cadastro, autenticação,
> Termo de Uso com assinatura eletrônica e o fluxo de verificação manual de CRECI
> pela equipe.

Referências cruzadas dos documentos de origem:
- Proposta comercial → Sprint 1 (Dias 1 a 7).
- Escopo do cliente v1.4 → **Fase 1 (Onboarding do Corretor-Captador)**, **Fase 4
  (Onboarding do Corretor-Comprador)** e itens 1 e 2 da tabela 6.1.

---

## 1. Entregáveis da Sprint

1. Documento de Definição do MVP aprovado (telas e fluxos) — este documento faz parte disso.
2. Infraestrutura provisionada e repositório configurado (detalhada na seção 7 deste documento).
3. Banco de dados modelado e migrado (tabelas desta Sprint).
4. API de autenticação (cadastro, login, sessão) funcional.
5. Cadastro de corretor com os campos do escopo.
6. Termo de Uso com **assinatura eletrônica por clique** (IP + timestamp + user-agent).
7. Painel/rotina de **verificação manual de CRECI** pela equipe (aprovar/rejeitar).
8. Tela de "perfil em análise" enquanto o CRECI não é aprovado.
9. Deploy de um ambiente de **staging** acessível ao cliente para validação da Sprint.

---

## 2. Escopo funcional detalhado

### 2.1 Cadastro de corretor

Campos coletados (escopo do cliente, Fase 1 e Fase 4):

| Campo | Obrigatório | Observação |
|---|---|---|
| Nome completo | Sim | |
| CRECI | Sim | Número do registro no CRECI-BA |
| WhatsApp | Sim | Usado para notificações (Sprint 3+) |
| E-mail | Sim | Login e notificações; único no sistema |
| Cidade / região | Sim | |
| Senha | Sim | Mín. 8 caracteres; armazenada com hash (bcrypt/argon2) |
| Papel | Sim | `captador`, `comprador` ou ambos |

Regras:
- E-mail e CRECI únicos na base.
- Ao concluir o cadastro, o corretor entra com status **`verificacao_pendente`** e
  **não** consegue cadastrar imóveis nem solicitar parcerias até ser aprovado.

### 2.2 Termo de Uso com assinatura eletrônica

Exigência do escopo do cliente (item 6.1 e Nota 17): **obrigatório no MVP**.

- Aceite por clique em checkbox no fim do cadastro.
- Registrar de forma **permanente**: `corretor_id`, versão do termo, **IP**,
  **user-agent**, **data/hora (timestamp)**.
- O aceite é pré-condição para ativar o perfil.

### 2.3 Verificação manual de CRECI (pela equipe)

> **Atenção (decisão de escopo):** no MVP a verificação é **manual**, feita pela
> equipe consultando o CRECI-BA (até 48h úteis). A verificação automática via API
> COFECI é **Fase 2** e está fora deste MVP.

- Área administrativa (acesso restrito à equipe) listando corretores com status
  `verificacao_pendente`.
- Ações: **Aprovar** (status → `ativo`) ou **Rejeitar** (status → `rejeitado`, com motivo).
- Ao aprovar, registrar `creci_verificado_em` e `verificado_por`.
- Notificação de aprovação/rejeição: e-mail no MVP (WhatsApp entra nas Sprints seguintes).

### 2.4 Autenticação e sessão

- Login por e-mail + senha.
- Sessão via **JWT** (access token) + refresh token, ou cookie de sessão httpOnly.
- Rotas protegidas por middleware que valida token e status do corretor.
- Recuperação de senha pode ficar como item leve de fim de Sprint (ou início da Sprint 2).

### 2.5 Regras de validação de campos

Validação em **dois níveis**: no cliente (feedback imediato) e no servidor (fonte de
verdade, com Zod no boundary). O servidor **nunca** confia no cliente.

| Campo | Regras | Mensagem de erro (exemplo) |
|---|---|---|
| `nome` | Obrigatório; 3–120 chars; letras/espaços/acentos | "Informe seu nome completo." |
| `email` | Obrigatório; formato RFC válido; normalizado para minúsculas; único | "E-mail inválido." / "Este e-mail já está cadastrado." |
| `senha` | Obrigatória; mín. 8 chars; ao menos 1 letra e 1 número | "A senha deve ter no mínimo 8 caracteres, com letras e números." |
| `creci` | Obrigatório; alfanumérico; 4–20 chars; normalizado (sem espaços); único | "CRECI inválido." / "Este CRECI já está cadastrado." |
| `whatsapp` | Obrigatório; DDD + número BR; validado como E.164 (`+55DDDNNNNNNNNN`) | "Informe um WhatsApp válido com DDD." |
| `cidade` | Obrigatória; 2–80 chars | "Informe sua cidade." |
| `papel` | Obrigatório; enum `captador` \| `comprador` \| `ambos` | "Selecione o tipo de atuação." |
| `aceite_termo` | Obrigatório; deve ser `true` | "É necessário aceitar o Termo de Uso." |
| `versao_termo` | Enviada pelo backend na tela; ecoada no aceite | — |

Normalizações no servidor antes de persistir:
- `email` → `trim` + `toLowerCase`.
- `creci` → `trim` + remoção de espaços internos.
- `whatsapp` → normalizado para E.164 (`+55` + dígitos).
- `ip` e `user_agent` do aceite → extraídos do request (`X-Forwarded-For` atrás de proxy).

---

## 3. Modelo de dados da Sprint

```sql
-- Corretor
CREATE TABLE corretor (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT        NOT NULL,
  email              TEXT        NOT NULL UNIQUE,
  senha_hash         TEXT        NOT NULL,
  creci              TEXT        NOT NULL UNIQUE,
  whatsapp           TEXT        NOT NULL,
  cidade             TEXT        NOT NULL,
  papel              TEXT        NOT NULL DEFAULT 'captador', -- captador | comprador | ambos
  status             TEXT        NOT NULL DEFAULT 'verificacao_pendente',
                     -- verificacao_pendente | ativo | rejeitado | suspenso
  creci_verificado_em TIMESTAMPTZ,
  verificado_por     UUID,       -- FK para usuario_equipe.id
  motivo_rejeicao    TEXT,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aceite do Termo de Uso (evidência jurídica)
CREATE TABLE termo_aceite (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id   UUID        NOT NULL REFERENCES corretor(id),
  versao_termo  TEXT        NOT NULL,
  ip            INET        NOT NULL,
  user_agent    TEXT        NOT NULL,
  aceito_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuário da equipe (admin) que verifica CRECI e aprova cadastros
CREATE TABLE usuario_equipe (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> As tabelas de imóveis, parcerias, chat etc. são das Sprints 2 a 4 e **não** entram
> nesta Sprint.

---

## 4. Contratos da API (Sprint 1)

Base URL: `/api/v1`. Todo corpo em JSON (`Content-Type: application/json`).
Autenticação via header `Authorization: Bearer <access_token>`.

### 4.1 Padrão de resposta de erro

Todos os erros seguem o mesmo envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos.",
    "fields": {
      "email": "E-mail inválido.",
      "senha": "A senha deve ter no mínimo 8 caracteres, com letras e números."
    }
  }
}
```

| Código HTTP | `code` | Quando ocorre |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Payload não passou na validação (Zod) |
| 401 | `UNAUTHENTICATED` | Token ausente/inválido/expirado |
| 403 | `FORBIDDEN` | Sem permissão (ex.: corretor acessando rota de equipe) |
| 403 | `ACCOUNT_NOT_ACTIVE` | Corretor não está `ativo` (pendente/rejeitado/suspenso) |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` | E-mail ou CRECI já cadastrado |
| 429 | `RATE_LIMITED` | Excesso de tentativas (login/registro) |
| 500 | `INTERNAL_ERROR` | Erro inesperado |

### 4.2 Endpoints

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| POST | `/auth/registro` | Cria corretor + registra aceite do termo | Público |
| POST | `/auth/login` | Autentica e retorna tokens | Público |
| POST | `/auth/refresh` | Renova access token | Refresh token |
| POST | `/auth/logout` | Invalida o refresh token | Autenticado |
| GET  | `/termo/atual` | Retorna versão e texto do Termo de Uso vigente | Público |
| GET  | `/corretores/me` | Dados e status do corretor logado | Corretor |
| GET  | `/admin/corretores` | Lista corretores (filtro por `status`) | Equipe |
| POST | `/admin/corretores/:id/aprovar` | Aprova CRECI → `ativo` | Equipe |
| POST | `/admin/corretores/:id/rejeitar` | Rejeita com motivo → `rejeitado` | Equipe |

### 4.3 `POST /auth/registro`

**Request**
```json
{
  "nome": "Maria Souza",
  "email": "maria@exemplo.com",
  "senha": "senha1234",
  "creci": "BA-12345",
  "whatsapp": "+5571999998888",
  "cidade": "Salvador",
  "papel": "captador",
  "aceite_termo": true,
  "versao_termo": "2026-07-01"
}
```
`ip` e `user_agent` são capturados pelo servidor a partir do request (não vêm no corpo).

**201 Created**
```json
{
  "corretor": {
    "id": "a1b2c3d4-...",
    "nome": "Maria Souza",
    "email": "maria@exemplo.com",
    "status": "verificacao_pendente",
    "papel": "captador"
  }
}
```
> Não retorna token: o corretor só faz login e acessa a área logada de "perfil em análise".

**Erros:** `400 VALIDATION_ERROR`, `409 CONFLICT` (e-mail/CRECI duplicado).

### 4.4 `POST /auth/login`

**Request**
```json
{ "email": "maria@exemplo.com", "senha": "senha1234" }
```

**200 OK**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<opaque>",
  "corretor": {
    "id": "a1b2c3d4-...",
    "nome": "Maria Souza",
    "status": "verificacao_pendente",
    "papel": "captador"
  }
}
```
> Login é permitido mesmo com status `verificacao_pendente` (para o corretor ver o
> andamento). O bloqueio ocorre nas rotas de negócio (Sprints 2+), não no login.
> `rejeitado`/`suspenso` também logam, mas caem em telas específicas.

**Erros:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED` (credenciais inválidas — mensagem genérica, sem revelar se o e-mail existe), `429 RATE_LIMITED`.

### 4.5 `GET /corretores/me`

**200 OK**
```json
{
  "id": "a1b2c3d4-...",
  "nome": "Maria Souza",
  "email": "maria@exemplo.com",
  "creci": "BA-12345",
  "whatsapp": "+5571999998888",
  "cidade": "Salvador",
  "papel": "captador",
  "status": "verificacao_pendente",
  "motivo_rejeicao": null,
  "criado_em": "2026-07-07T14:20:00Z"
}
```

### 4.6 `GET /admin/corretores`

Query params: `status` (opcional), `page` (default 1), `page_size` (default 20).
Ex.: `/admin/corretores?status=verificacao_pendente&page=1`.

**200 OK**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-...",
      "nome": "Maria Souza",
      "creci": "BA-12345",
      "cidade": "Salvador",
      "status": "verificacao_pendente",
      "criado_em": "2026-07-07T14:20:00Z"
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1
}
```

### 4.7 `POST /admin/corretores/:id/aprovar`

Sem corpo. Efeitos: `status → ativo`, grava `creci_verificado_em = now()` e
`verificado_por = <id da equipe>`; dispara e-mail de aprovação.

**200 OK** → `{ "id": "...", "status": "ativo" }`
**Erros:** `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT` (já processado).

### 4.8 `POST /admin/corretores/:id/rejeitar`

**Request**
```json
{ "motivo": "CRECI não localizado na base do CRECI-BA." }
```
Efeitos: `status → rejeitado`, grava `motivo_rejeicao`; dispara e-mail de rejeição.
`motivo` obrigatório (5–500 chars).

**200 OK** → `{ "id": "...", "status": "rejeitado" }`

### 4.9 Segurança dos endpoints

- Rate limiting em `/auth/registro` e `/auth/login` (ex.: 5–10 req/min por IP).
- Rotas `/admin/*` exigem token de `usuario_equipe` (role `equipe`).
- CORS restrito à origem do frontend (`CORS_ORIGIN`).
- Mensagens de erro de login genéricas (evitar enumeração de usuários).

---

## 5. Identidade visual e design

Proposta de identidade derivada da logo **Imob Parcerias** (casa estilizada em
verde e laranja, wordmark branco/laranja sobre fundo azul-marinho, com Salvador
ao fundo — Farol da Barra e Igreja). As cores abaixo são uma **proposta** e devem
ser confirmadas pelo cliente (ver perguntas na seção 9).

### 5.1 Paleta de cores

| Papel | Nome | HEX | Uso principal |
|---|---|---|---|
| Marca (escuro) | Navy 900 | `#14273D` | Fundo institucional, header, footer, tela de login |
| Marca (escuro) | Navy 700 | `#1F3A5A` | Superfícies escuras secundárias, hover em navy |
| Primária | Green 500 | `#6FAA2D` | Ações principais (Entrar, Salvar, Aprovar), links de destaque |
| Primária | Green 600 | `#5C8F24` | Hover/active do verde |
| Secundária | Orange 500 | `#EC7A1C` | CTA de conversão, ênfase, elementos do comprador |
| Secundária | Orange 600 | `#D06714` | Hover/active do laranja |
| Base | White | `#FFFFFF` | Fundo de conteúdo, cards |
| Neutro | Gray 50 | `#F6F8FA` | Fundo de páginas claras |
| Neutro | Gray 100 | `#EDF1F5` | Bordas suaves, divisores |
| Neutro | Gray 300 | `#CBD5E0` | Bordas de inputs, estados desabilitados |
| Neutro | Gray 500 | `#64748B` | Texto secundário, placeholders |
| Neutro | Gray 700 | `#334155` | Texto de apoio |
| Neutro | Gray 900 | `#1A2332` | Texto principal |

Cores semânticas (feedback):

| Estado | HEX | Uso |
|---|---|---|
| Sucesso | `#2E9E5B` | Confirmações, toasts positivos |
| Aviso | `#E8A100` | Alertas, "perfil em análise" |
| Erro | `#D64545` | Mensagens de erro, "perfil rejeitado" |
| Info | `#2F6FED` | Avisos informativos |

### 5.2 Mapeamento por perfil e por status

Aproveitando os dois tons da casa na logo (verde + laranja) para reforçar o
**princípio de simetria** entre os dois lados da parceria:

- **Corretor-captador → verde** (`#6FAA2D`).
- **Corretor-comprador → laranja** (`#EC7A1C`).

Badges de status do imóvel (para as próximas Sprints, já padronizados aqui):

| Status | Cor |
|---|---|
| DISPONÍVEL | Verde `#6FAA2D` |
| EM NEGOCIAÇÃO | Laranja `#EC7A1C` |
| VENDIDO | Cinza `#64748B` |
| INATIVO | Cinza claro `#CBD5E0` |

### 5.3 Tipografia

- **Títulos:** Poppins (geométrica, alinhada ao traço da logo). Alternativa: Montserrat.
- **Corpo/interface:** Inter. Alternativa: system-ui.
- Escala sugerida: 32/24/20 (títulos), 16 (corpo), 14 (apoio), 12 (legendas).
- Ambas são gratuitas (Google Fonts), servidas via `next/font` (sem custo, boa performance).

### 5.4 Componentes base

- **Botão primário:** fundo verde `#6FAA2D`, texto branco, radius 8px, hover `#5C8F24`.
- **Botão secundário/CTA:** fundo laranja `#EC7A1C`, texto branco, hover `#D06714`.
- **Botão terciário:** contorno (outline) navy/verde, fundo transparente.
- **Inputs:** fundo branco, borda `#CBD5E0`, foco com borda verde; erro com borda `#D64545` e texto de ajuda abaixo.
- **Cards:** fundo branco, radius 12–16px, sombra suave, borda `#EDF1F5`.
- **Header autenticado:** fundo Navy 900 com a logo à esquerda.

### 5.5 Tela de Login — proposta visual

- **Fundo:** Navy 900 (`#14273D`) com a arte de Salvador da logo esmaecida
  (overlay escuro ~70%), reforçando a identidade regional.
- **Card central branco** (radius 16px, sombra), largura ~400px no desktop e ~90%
  no mobile (Mobile-First).
- **Topo do card:** logo Imob Parcerias.
- **Campos:** e-mail e senha (senha com botão mostrar/ocultar).
- **Link "Esqueci minha senha"** alinhado à direita, em verde.
- **Botão "Entrar":** primário verde, largura total, com spinner no estado de loading.
- **Rodapé do card:** "Não tem conta? **Cadastre-se**" (link em laranja → `/cadastro`).
- **Erro:** banner vermelho suave (`#D64545`) acima do formulário, mensagem genérica
  ("E-mail ou senha inválidos").

Wireframe (referência):

```
        [ Imob Parcerias ]          ← fundo navy + Salvador esmaecido
   ┌───────────────────────────┐
   │        (logo)             │
   │        Entrar             │
   │  ┌─────────────────────┐  │
   │  │ E-mail              │  │
   │  └─────────────────────┘  │
   │  ┌─────────────────────┐  │
   │  │ Senha           👁  │  │
   │  └─────────────────────┘  │
   │        Esqueci a senha →  │
   │  ┌─────────────────────┐  │
   │  │      Entrar (verde) │  │
   │  └─────────────────────┘  │
   │  Não tem conta? Cadastre-se│
   └───────────────────────────┘
```

### 5.6 Aplicação da marca nas demais telas

- **Cadastro:** mesmo padrão do login (card sobre fundo navy); seleção de papel
  usa verde (captador) e laranja (comprador) como cores de destaque.
- **Perfil em análise:** cabeçalho/ícone em amarelo/aviso (`#E8A100`).
- **Perfil rejeitado:** cabeçalho/ícone em erro (`#D64545`), com o motivo em destaque.
- **Home autenticada e Admin:** header navy, conteúdo em fundo claro (`#F6F8FA`),
  ações primárias em verde.

---

## 6. Telas do frontend (Next.js / PWA)

Todas Mobile-First. Estados obrigatórios em cada tela com dados: **loading**,
**erro** e **vazio** quando aplicável.

### 5.1 Fluxo de navegação

```mermaid
flowchart TD
    L[Landing] -->|Cadastrar| C[Cadastro]
    L -->|Entrar| Lg[Login]
    C -->|sucesso| Lg
    Lg -->|status=pendente| P[Perfil em análise]
    Lg -->|status=rejeitado| R[Perfil rejeitado]
    Lg -->|status=ativo| H[Home autenticada]
    Lg -->|role=equipe| A[Admin: fila CRECI]
```

### 5.2 Landing / entrada (`/`)
- **Objetivo:** apresentar a plataforma e direcionar para cadastro/login.
- **Elementos:** headline, breve descrição, botões "Cadastrar" e "Entrar".
- **Navegação:** → `/cadastro`, → `/login`.

### 5.3 Cadastro de corretor (`/cadastro`)
- **Objetivo:** criar conta e registrar aceite do Termo.
- **Campos:** nome, e-mail, senha, confirmar senha, CRECI, WhatsApp (com máscara
  BR), cidade, seleção de papel (`captador`/`comprador`/`ambos`), checkbox
  "Li e aceito o Termo de Uso" (link abre o texto retornado por `GET /termo/atual`).
- **Validação client-side:** regras da seção 2.5 + "confirmar senha" deve bater;
  botão "Criar conta" desabilitado enquanto o checkbox do termo não for marcado.
- **Comportamento:** ao enviar → `POST /auth/registro`. Erros de campo destacam o
  input correspondente (usa `error.fields`). Conflito (409) mostra mensagem no
  campo e-mail/CRECI. Sucesso → redireciona para `/login` com aviso "Conta criada,
  faça login".
- **Estados:** loading no submit; desabilitar botão durante o request.

### 5.4 Login (`/login`)
- **Campos:** e-mail, senha; link "Esqueci minha senha" (leve/fim de Sprint).
- **Comportamento:** `POST /auth/login`. Guarda tokens (access em memória/cookie
  httpOnly; refresh em cookie httpOnly). Redireciona conforme `status`/role (ver 5.1).
- **Erros:** credenciais inválidas → mensagem única genérica; `429` → "Muitas
  tentativas, tente novamente em instantes".

### 5.5 Perfil em análise (`/perfil/analise`)
- **Objetivo:** informar que o CRECI está em verificação (até 48h úteis).
- **Elementos:** status visual "Em análise", explicação, dados do cadastro (somente
  leitura), botão sair. Bloqueia acesso às áreas de negócio.
- **Origem dos dados:** `GET /corretores/me`.

### 5.6 Perfil rejeitado (`/perfil/rejeitado`)
- **Elementos:** status "Não aprovado", exibe `motivo_rejeicao`, canal de contato
  (WhatsApp/e-mail da equipe) e orientação de próximos passos.

### 5.7 Home autenticada — placeholder (`/app`)
- **Objetivo:** área logada do corretor `ativo`.
- **Conteúdo na Sprint 1:** saudação + card "Em breve: vitrine de imóveis"
  (evolui na Sprint 2). Menu/logout.

### 5.8 Admin — fila de verificação de CRECI (`/admin/corretores`)
- **Acesso:** apenas `usuario_equipe`.
- **Elementos:** tabela de pendentes (nome, CRECI, cidade, data), filtro por status,
  paginação. Cada linha: botão **Aprovar** e **Rejeitar** (abre modal pedindo motivo).
- **Comportamento:** aprovar → `POST /admin/corretores/:id/aprovar`; rejeitar →
  `POST /admin/corretores/:id/rejeitar` com `motivo`. Atualiza a lista após a ação
  (otimista ou refetch). Estados de loading/erro/vazio.

### 5.9 Requisitos PWA (nesta Sprint)
- `manifest.json` com nome, ícones (192/512), `theme_color`, `display: standalone`.
- Service worker básico (registro + cache de shell).
- Responsividade Mobile-First e meta viewport.

---

## 7. Infraestrutura necessária (ferramentas gratuitas)

Tudo provisionado em tiers gratuitos. As contas devem ser criadas **no nome/propriedade
do cliente**; o desenvolvedor configura e dá suporte passo a passo.

| Serviço | Função | Plano | Custo no MVP |
|---|---|---|---|
| GitHub | Repositório + CI/CD | Repos privados | R$ 0 |
| Neon | PostgreSQL serverless | Free (0,5 GB) | R$ 0 |
| Vercel | Deploy do frontend Next.js | Hobby | R$ 0 |
| Render (ou Railway) | Deploy do backend Node.js | Free web service | R$ 0 |
| Resend (ou SMTP grátis) | E-mails transacionais | 3.000/mês | R$ 0 |
| Registro.br | Domínio `.com.br` | — | ~R$ 40/ano |

> Observação: o free tier do Render "dorme" após inatividade (cold start de alguns
> segundos). Aceitável em staging; reavaliar quando o chat em tempo real entrar (Sprint 3).

Provisionamento desta Sprint:
1. Repositório privado `imob-parcerias` (monorepo: `apps/web` e `apps/api`), branch
   `main` protegida, `.gitignore` e `.env.example`.
2. Projeto Neon com dois branches de banco: `main` (produção) e `staging`.
3. Web Service (backend) no Render apontando para `apps/api`, com as migrations
   rodando no deploy.
4. Projeto Vercel (frontend) apontando para `apps/web`.
5. Conta Resend com `RESEND_API_KEY` para os e-mails de aprovação/rejeição.

Variáveis de ambiente:

```bash
DATABASE_URL=postgresql://user:senha@host/db?sslmode=require
JWT_SECRET=troque-por-um-segredo-forte
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
RESEND_API_KEY=
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

> Segurança: nunca commitar `.env`; gerar `JWT_SECRET` forte (`openssl rand -base64 32`);
> manter `sslmode=require` no Neon.

---

## 8. Definição de Pronto (Definition of Done)

- [ ] Repositório com README, padrão de branches e `.env.example`.
- [ ] Migrations versionadas e aplicáveis do zero no Neon.
- [ ] Cadastro cria corretor `verificacao_pendente` + registra aceite do termo (IP/timestamp/user-agent).
- [ ] Login funciona e bloqueia corretor não `ativo` nas rotas protegidas.
- [ ] Equipe aprova/rejeita e o corretor recebe e-mail do resultado.
- [ ] Senhas com hash; sem segredos no código; variáveis via ambiente.
- [ ] Deploy de staging (Vercel + Render + Neon) acessível ao cliente.
- [ ] Validação/aprovação do cliente ao fim da Sprint.

---

## 9. Definições pendentes — perguntas ao cliente

Itens que precisamos definir com o cliente para fechar a Sprint 1 sem retrabalho.
Cada pergunta traz **por que importa** e um **exemplo de resposta** para agilizar.

### A. Marca e identidade visual

| # | Pergunta | Por que importa | Exemplo de resposta |
|---|---|---|---|
| A1 | As cores propostas na seção 5.1 estão aprovadas? | Definem toda a UI da aplicação | "Sim, aprovadas" / "Trocar o laranja por `#F2851E`" |
| A2 | Existe manual de marca / fontes oficiais? | Evita divergência com a identidade | "Não temos, usem Poppins + Inter" / "Segue PDF do manual" |
| A3 | Podem enviar a logo em vetor (SVG/PNG fundo transparente) e o ícone isolado da casa? | Necessário para header, favicon e ícones do PWA | "Segue SVG em anexo" |

### B. Cadastro e dados do corretor

| # | Pergunta | Por que importa | Exemplo de resposta |
|---|---|---|---|
| B1 | Um mesmo corretor pode atuar como captador **e** comprador? | Define o campo "papel" (permitir "ambos") | "Sim, pode os dois" / "Não, escolhe um" |
| B2 | Além de nome, CRECI, WhatsApp, e-mail e cidade, coletamos algo mais no cadastro (ex.: CPF do corretor, nome da imobiliária, foto de perfil)? | Define o formulário e o banco | "Adicionar nome da imobiliária (opcional)" |
| B3 | O campo cidade é texto livre ou lista fixa de cidades da Bahia? | Impacta busca/padronização | "Lista fixa: Salvador, Feira de Santana, Camaçari..." |
| B4 | Confirmar por e-mail antes de ativar (double opt-in)? | Reduz cadastros falsos, mas adiciona etapa | "Não precisa no MVP" / "Sim, confirmar e-mail" |

### C. Verificação de CRECI e equipe

| # | Pergunta | Por que importa | Exemplo de resposta |
|---|---|---|---|
| C1 | Quem faz a verificação manual e quantos usuários de equipe (admin) teremos? | Cria os acessos administrativos | "2 usuários: Ana e João" |
| C2 | Como a equipe quer ser avisada de um novo cadastro pendente? | Define notificação da fila | "E-mail para parcerias@... a cada novo pendente" |
| C3 | Exibir ao corretor o prazo "até 48h úteis" na tela de análise? | Alinha expectativa do usuário | "Sim, mostrar o prazo" |
| C4 | Qual WhatsApp/e-mail de contato mostrar na tela de "perfil rejeitado"? | Canal para o corretor recorrer | "WhatsApp (71) 9xxxx-xxxx" |

### D. Legal e Termo de Uso

| # | Pergunta | Por que importa | Exemplo de resposta |
|---|---|---|---|
| D1 | Qual o texto oficial do Termo de Uso? | Obrigatório no cadastro (assinatura eletrônica) | "Segue .docx em anexo" |
| D2 | Como versionamos o Termo? | Registrado junto ao aceite (IP + timestamp) | "Versão pela data: 2026-07-01" |
| D3 | Haverá Política de Privacidade (LGPD) separada? | Pode exigir 2º aceite e link no cadastro | "Sim, segue texto" / "Não no MVP" |

### E. Domínio, e-mail e infraestrutura

| # | Pergunta | Por que importa | Exemplo de resposta |
|---|---|---|---|
| E1 | Qual o domínio oficial e ele já está registrado? | Necessário para deploy e e-mail | "imobparcerias.com.br, já registrado" |
| E2 | Qual remetente e nome de exibição dos e-mails? | Configuração do Resend/SMTP | "Imob Parcerias <parcerias@imobparcerias.com.br>" |
| E3 | Podem criar as contas de Vercel, Neon e Render em nome da empresa? | Titularidade da infra fica com o cliente | "Sim, agende que fazemos juntos" |

---

## 10. Fora do escopo desta Sprint

- Cadastro de imóveis, upload de fotos, chave anti-duplicata (Sprint 2).
- Vitrine e busca (Sprint 2/3).
- Match, chat interno (Sprint 3).
- Agendamento, confirmação bilateral, liberação de WhatsApp, contrato de parceria (Sprint 4).
- Verificação automática de CRECI (Fase 2).
- Notificações via WhatsApp (Sprints seguintes; nesta Sprint, e-mail apenas).
