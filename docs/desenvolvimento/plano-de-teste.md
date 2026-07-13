# Plano de Teste — Imob Parcerias (MVP)

Roteiro para validar o fluxo completo, dos usuários e imóveis de demonstração até o
ciclo de parceria (Fases 1 a 9). Marque cada item ao validar.

---

## 0. Preparação do ambiente

1. **Banco migrado** (roda sozinho no deploy do Render; local: `npm run migrate -w apps/api`).
2. **Criar o admin da equipe** (uma vez):
   ```bash
   DATABASE_URL="<sua-url>" ADMIN_NOME="Equipe" ADMIN_EMAIL="mvgestaodeimoveis@gmail.com" \
   ADMIN_SENHA="<senha-forte>" npm run seed:admin -w apps/api
   ```
3. **Popular dados de demonstração**:
   ```bash
   DATABASE_URL="<sua-url>" JWT_SECRET="<32+ chars>" npm run seed:demo -w apps/api
   ```
   > Não rode o seed de demonstração com `NODE_ENV=production`. Ele apaga e recria os dados `@demo.com`.

### Usuários de teste (senha de todos: `Senha@123`)
| E-mail | Papel/estado |
|---|---|
| `joao.captador@demo.com` | Ativo — captador, com 3 imóveis |
| `maria.compradora@demo.com` | Ativo — compradora, com 1 solicitação enviada |
| `pedro.pendente@demo.com` | Verificação de CRECI pendente |
| `ana.suspensa@demo.com` | Suspenso |
| Admin (seed acima) | Equipe — acessa `/admin/login` |

Imóveis do João: **1 disponível** (na vitrine), **1 com exclusividade pendente**, **1 inativo**.

---

## 1. Cadastro e autenticação (Fase 1/4)
- [ ] Criar conta em `/cadastro` (etapa 1: nome, e-mail, senha) → recebe e-mail de confirmação (em dev, aparece no log).
- [ ] Completar cadastro em `/completar-cadastro` (WhatsApp, cidade da lista fixa, CRECI, aceite do Termo + Política) → status "verificação pendente".
- [ ] Tela **"perfil em análise"** aparece enquanto o CRECI não é aprovado.
- [ ] Login com `pedro.pendente@demo.com` → cai na tela de análise.
- [ ] Login com `ana.suspensa@demo.com` → acesso restrito (suspenso).
- [ ] Recuperação de senha em `/esqueci-senha` gera e-mail com link.

## 2. Verificação de CRECI pela equipe (Fase 1)
- [ ] Login admin em `/admin/login` → `/admin/dashboard` mostra KPIs.
- [ ] `/admin/corretores` (filtro "Pendente") lista o Pedro → **Aprovar** → Pedro vira ativo (recebe e-mail).
- [ ] Testar **Rejeitar** outro corretor pendente (com motivo) → status rejeitado.
- [ ] Filtro "Ativo" → **Suspender** um corretor; filtro "Suspenso" → **Reativar**.

## 3. Cadastro de imóvel (Fase 2)
- [ ] Como `joao.captador@demo.com`, ir em **Cadastrar imóvel**.
- [ ] **Modalidade manual**: preencher as 5 etapas; tentar publicar com menos de 5 fotos → bloqueia.
- [ ] Publicar com ficha completa (5 fotos, ≥1 diferencial, documentação, aceite do **Termo de Parceria**) → aparece na carteira.
- [ ] **Importação por link**: colar uma URL de anúncio → campos públicos pré-preenchidos; endereço/documentação continuam obrigatórios.
- [ ] **Duplicata**: cadastrar o mesmo endereço/unidade → bloqueio (exata) ou confirmação (mesmo prédio).
- [ ] **Exclusividade**: marcar exclusividade + enviar contrato + vencimento → status "verificação pendente".

## 4. Exclusividade pela equipe (Fase 2/7.5)
- [ ] `/admin/exclusividades` lista o imóvel pendente → **Verificar** → ganha o selo "Exclusividade Verificada".
- [ ] Testar **Rejeitar** exclusividade em outro imóvel.

## 5. Vitrine (Nível 1) (Fase 5)
- [ ] `/vitrine` (sem login) mostra só imóveis **disponíveis com ficha completa**, **sem endereço**.
- [ ] Filtros por tipo, bairro, preço e metragem funcionam.
- [ ] Selo de exclusividade aparece quando aplicável.

## 6. Solicitação de parceria + contrato (Fase 6)
- [ ] Como `maria.compradora@demo.com`, abrir um imóvel na vitrine → **Solicitar parceria** (nome do cliente + confirmar interesse).
- [ ] Não é possível solicitar parceria no **próprio** imóvel.
- [ ] Em `/parcerias`, a Maria vê a solicitação em **Enviadas**; o João vê em **Recebidas** (badge "aguardando").
- [ ] **Ver contrato** exibe a **versão inicial** (comissão 10%, janela 180 dias, sem endereço/CPF).
- [ ] João **Aceita** (Maria recebe e-mail) ou **Recusa** (com motivo).
- [ ] Maria consegue **Cancelar** a própria solicitação (status solicitada/aceita).

## 7. Chat + confirmação bilateral (Fase 7)
- [ ] Após aceite, ambos abrem **Abrir conversa** (`/parcerias/[id]`); endereço completo (Nível 2) visível.
- [ ] **Chat** troca mensagens (atualiza a cada ~8s).
- [ ] **Simetria**: só o **captador** registra a data da visita; só o **comprador** insere o CPF (validado).
- [ ] Com **as duas** confirmações → status **EM NEGOCIAÇÃO**, **contatos revelados** (Nível 3), janela de 180 dias ativada.
- [ ] **Ver contrato** agora mostra a **versão final** (com bloco de confirmação bilateral).

## 8. Fechamento da venda (Fase 8)
- [ ] Captador **Declara venda** (valor) → comissão 5% e taxa 10% calculadas; imóvel vira **VENDIDO**.
- [ ] `/admin/pagamentos` lista a taxa pendente → **Confirmar** recebimento (PIX).
- [ ] Após confirmação, **avaliação mútua** (1–5 estrelas) é liberada para os dois; cada um avalia **uma vez**.

## 9. Encerramento sem venda + fila (Fase 9)
- [ ] Em uma parceria EM NEGOCIAÇÃO, **Encerrar sem venda** → imóvel volta a **DISPONÍVEL**.
- [ ] Compradores que estavam na fila (solicitação pendente) recebem e-mail de "imóvel disponível".

## 10. Moderação e manutenção (admin/jobs)
- [ ] `/admin/imoveis` lista todos os imóveis (filtro status/cidade/busca) → **Desabilitar/Reativar/Excluir**.
- [ ] Imóvel **inativo** pode ser **reativado** pelo próprio dono na página do imóvel.
- [ ] Job diário `/api/v1/jobs/imoveis-inativos` (com `x-cron-secret`): dispara 1º/2º aviso e inativa após os prazos.
- [ ] Job `/api/v1/jobs/exclusividade-vencendo` avisa exclusividades a vencer em 15 dias.
- [ ] Job `/api/v1/jobs/pagamentos-vencidos` suspende captadores com taxa vencida.

## 11. Painel de KPIs (Seção 1.6)
- [ ] `/admin/dashboard` mostra: corretores, imóveis na vitrine, parcerias iniciadas/confirmadas/vendas, financeiro e **taxa de abandono** do cadastro.

## 12. Páginas legais
- [ ] `/termo`, `/termo-parceria` e `/politica-privacidade` abrem **sem login**, com layout padronizado e contato oficial.

---

## Observações
- **E-mails/WhatsApp**: sem `RESEND_API_KEY`/provedor de WhatsApp, as mensagens caem no **log** do servidor (não são enviadas de verdade). Isso é esperado em teste.
- **Login com Google**: só funciona com as credenciais no Render/Vercel e o e-mail adicionado como *usuário de teste* no Google Cloud.
- Para reexecutar do zero: rode `npm run seed:demo` novamente (ele limpa e recria os dados `@demo.com`).
