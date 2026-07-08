# Imob Parcerias — Documentação Técnica

Plataforma B2B de parcerias entre corretores de imóveis (MVP).

## Stack definida

| Camada | Tecnologia | Hospedagem (gratuita) |
|---|---|---|
| Frontend | Next.js (React) — PWA, Mobile-First | Vercel (Hobby) |
| Backend | Node.js (API REST) | Render / Railway (free tier) |
| Banco de dados | PostgreSQL | Neon (Serverless, free tier) |
| Armazenamento de fotos | Cloudflare R2 / AWS S3 | Free tier (a partir da Sprint 2) |

## Organização da documentação

```
docs/
├── README.md               # este índice
├── desenvolvimento/        # documentação de desenvolvimento (o que guia o código)
│   ├── sprint-01-base-e-corretores.md
│   ├── infraestrutura-setup.md
│   └── pontos-de-alinhamento.md
└── referencias/            # arquivos auxiliares / documentos de origem
    ├── ImobParcerias Escopo MVP v1.pdf
    ├── proposta-mvp.pdf
    └── logo-imob-parcerias.jpeg
```

## Documentação de desenvolvimento

- [Detalhamento da Sprint 1 — Base e Corretores](./desenvolvimento/sprint-01-base-e-corretores.md)
- [Setup de Infraestrutura (ferramentas gratuitas)](./desenvolvimento/infraestrutura-setup.md)
- [Pontos de alinhamento com o cliente](./desenvolvimento/pontos-de-alinhamento.md)

## Arquivos auxiliares (referências)

- `referencias/ImobParcerias Escopo MVP v1.pdf` — escopo funcional enviado pelo cliente (v1.4).
- `referencias/proposta-mvp.pdf` — proposta comercial enviada ao cliente.
- `referencias/logo-imob-parcerias.jpeg` — logo da marca (base para a identidade visual).

> **Regra de precedência:** onde a proposta comercial e o escopo do cliente
> divergirem, vale o **escopo do cliente (v1.4)**, por ser mais detalhado e
> mais restritivo. As divergências estão registradas em
> [pontos-de-alinhamento.md](./desenvolvimento/pontos-de-alinhamento.md).

## Estrutura do repositório (monorepo)

```
imob-parcerias/
├── docs/            # Documentação técnica e de produto
├── apps/
│   ├── web/         # Frontend Next.js (PWA)
│   └── api/         # Backend Node.js (API REST)
└── packages/        # Código compartilhado (tipos, validações) — opcional
```
