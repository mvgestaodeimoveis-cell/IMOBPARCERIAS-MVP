# Imob Parcerias — O que já está pronto e como validar

> Documento para o cliente conferir tudo o que foi implementado até aqui e dar o
> **OK** ou pedir ajustes. Data: **10/07/2026**.

- **Site (produção):** https://www.imobparcerias.com.br
- **Área da equipe (admin):** https://www.imobparcerias.com.br/admin/login
- **Repositório:** `mvgestaodeimoveis-cell/IMOBPARCERIAS-MVP`

---

## 1. Visão geral do que existe hoje

A plataforma já cobre o **fluxo completo de captação e vitrine de imóveis entre
corretores parceiros**, com verificação da equipe. Em resumo:

1. Corretor se **cadastra** e passa por **verificação de CRECI** pela equipe.
2. Depois de aprovado, ele **cadastra imóveis** (com anti-duplicata, fotos,
   documentação e exclusividade opcional).
3. Os imóveis com **ficha completa** aparecem na **vitrine pública** (Nível 1,
   sem expor o endereço).
4. A equipe **verifica exclusividades** e gerencia corretores.
5. Um **rotina mensal** inativa imóveis parados, mantendo a vitrine atualizada.

---

## 2. Funcionalidades implementadas

### 2.1. Cadastro e acesso do corretor
- Cadastro em **duas etapas**: (1) nome, e-mail e senha; (2) completar dados
  (WhatsApp, cidade, CRECI, imobiliária) e aceite do termo.
- **Confirmação de e-mail** com link.
- **Login, logout e refresh de sessão** automáticos.
- **Recuperação de senha** ("Esqueci minha senha" → e-mail → redefinir).
- Redirecionamento inteligente conforme a situação da conta (cadastro
  incompleto, em análise, rejeitado, ativo).

### 2.2. Verificação de CRECI pela equipe
- Fila de **corretores pendentes** na área da equipe.
- Ações de **Aprovar** / **Rejeitar** (com motivo).
- E-mails automáticos de **boas-vindas**, **CRECI aprovado** e **CRECI
  rejeitado**, com a identidade visual da marca.

### 2.3. Cadastro de imóveis (assistente em 5 etapas)
- **Etapa 1 — Tipo do anúncio:** finalidade (venda/aluguel) e tipo
  (apartamento, casa, terreno, comercial). Também permite **importar por link**.
- **Etapa 2 — Localização:** CEP com **preenchimento automático** de rua,
  bairro e cidade; campos específicos por tipo (apartamento: unidade/andar/bloco;
  comercial: sala/unidade; casa: em condomínio).
- **Etapa 3 — Detalhes:** preço, metragem, quartos/suítes/banheiros/vagas,
  **diferenciais** e **documentação disponível** (mín. 1).
- **Etapa 4 — Fotos:** upload de fotos (mín. 5 para entrar na vitrine).
- **Etapa 5 — Revisão:** descrição, **exclusividade** (opcional) e publicação.

### 2.4. Anti-duplicata inteligente
- O sistema identifica **imóveis repetidos** por uma "chave" que varia conforme
  o tipo (apartamento considera unidade/andar/bloco, terreno considera a área,
  etc.).
- **Duplicata exata** é **bloqueada**.
- **Duplicata possível** (mesmo prédio, unidade diferente) pede uma
  **confirmação** ao corretor antes de publicar.

### 2.5. Importação de imóvel por link
- O corretor cola o **link do anúncio** (ex.: portais imobiliários) e o sistema
  tenta **preencher automaticamente** preço, tipo, área, quartos, vagas, bairro
  e cidade.
- Proteção contra endereços internos/inseguros.

### 2.6. Fotos (Cloudinary)
- Upload direto e seguro das fotos, com capa e galeria.

### 2.7. Documentação disponível (Seção 2.4 do escopo)
- Checklist no cadastro: **Escritura, Matrícula, IPTU em dia, Contrato de compra
  e venda, Habite-se, Planta** (mínimo 1 obrigatório).

### 2.8. Fluxo de exclusividade
- No cadastro, o corretor pode declarar **contrato de exclusividade** anexando o
  **contrato (imagem ou PDF)** e informando a **data de vencimento**.
- O imóvel entra como **exclusividade pendente**.
- A **equipe verifica** na fila de exclusividades e aprova (ganha o **selo de
  exclusividade verificada**) ou rejeita.

### 2.9. Vitrine pública (Nível 1)
- Página pública com **busca e filtros** (tipo, finalidade, cidade, bairro,
  faixa de preço e área).
- Só aparecem imóveis com **ficha completa** (mín. 5 fotos, ≥1 diferencial e
  quartos/banheiros/vagas informados).
- **O endereço não é exposto** — só bairro/cidade e características. O contato é
  via "Solicitar parceria".

### 2.10. Carteira e status do imóvel
- **Meus imóveis** (carteira) com fotos e situação de cada um.
- Status oficiais: **Disponível**, **Em negociação**, **Vendido**, **Inativo**.
- No detalhe do imóvel o corretor pode: marcar **em negociação**, voltar para
  **disponível**, marcar **vendido**, **reativar** e **remover**.

### 2.11. Rotina mensal de inatividade (Fase 3)
- Uma vez por mês, imóveis **disponíveis sem atualização há 60 dias** (valor
  ajustável) passam para **Inativo** automaticamente, saindo da vitrine.
- O corretor **reativa** quando quiser, mantendo a vitrine sempre atual.
- Roda de forma **gratuita** via GitHub Actions (não depende de plano pago).

---

## 3. Roteiro de validação (passo a passo)

> Sugestão: teste primeiro como **corretor** e depois como **equipe**.

### A) Como corretor
1. Acesse o site e clique em **Cadastrar**. Crie a conta e **confirme o e-mail**.
2. Complete o cadastro (WhatsApp, cidade, CRECI, imobiliária) e aceite o termo.
3. Aguarde a **aprovação da equipe** (passo B) — enquanto isso a conta fica "em
   análise".
4. Após aprovado, entre no **painel** e clique em **Cadastrar imóvel**:
   - Teste o **CEP** preenchendo automaticamente o endereço.
   - Preencha detalhes, selecione **diferenciais** e **documentação**.
   - Envie **pelo menos 5 fotos**.
   - Na revisão, marque **exclusividade**, anexe um contrato (imagem/PDF) e uma
     data de vencimento e **publique**.
5. Teste a **anti-duplicata**: tente cadastrar o **mesmo imóvel** de novo (deve
   bloquear) e um do **mesmo prédio com outra unidade** (deve pedir confirmação).
6. Teste a **importação por link** em um novo cadastro.
7. Na **carteira**, abra o imóvel e teste os status: **em negociação**,
   **vendido**, **reativar**, **remover**.

### B) Como equipe (admin)
1. Acesse **/admin/login** com o usuário da equipe.
2. Em **Verificação de CRECI**, **aprove** o corretor de teste (ele recebe
   e-mail).
3. Vá em **Ver fila de exclusividades** e **verifique** o imóvel com contrato
   (ele passa a ter o selo) ou **rejeite**.

### C) Vitrine pública
1. Abra a **/vitrine** (sem estar logado).
2. Confira que o imóvel publicado aparece **com ficha completa** e **sem
   endereço**.
3. Teste os **filtros** (tipo, cidade, bairro, preço, área).

---

## 4. Checklist de validação do cliente

Marque **OK** ou anote **ajuste** ao lado de cada item:

- [ ] Cadastro + confirmação de e-mail do corretor
- [ ] Recuperação de senha
- [ ] Aprovação/rejeição de CRECI (equipe) + e-mails
- [ ] Assistente de cadastro de imóvel (5 etapas)
- [ ] Preenchimento de endereço por CEP
- [ ] Anti-duplicata (exata bloqueia / mesmo prédio confirma)
- [ ] Importação de imóvel por link
- [ ] Upload de fotos (mín. 5)
- [ ] Documentação disponível (checklist obrigatório)
- [ ] Exclusividade (envio de contrato + verificação pela equipe + selo)
- [ ] Vitrine pública com filtros e **sem endereço**
- [ ] Status do imóvel (disponível/em negociação/vendido/inativo)
- [ ] Carteira "Meus imóveis"

---

## 5. Observações e próximos passos

- **Itens ainda não iniciados** (fases seguintes do escopo): fluxo de
  **demandas/compradores**, **matches** entre imóvel e demanda, **agenda** e
  mensagens entre corretores. Esses itens aparecem no menu, mas ainda **não têm
  função** — são a próxima etapa.
- **Textos e rótulos** (nomes de status, mensagens, e-mails) podem ser ajustados
  conforme a preferência da marca.
- Ao validar, por favor **liste os ajustes desejados** para entrarmos com as
  correções antes de seguir para a próxima fase.

---

## 6. Notas técnicas (para a equipe de TI)

- **Deploy:** front-end na Vercel, API no Render, banco no Neon (Postgres),
  fotos no Cloudinary, e-mails via Resend.
- **Rotina mensal:** endpoint protegido `POST /api/v1/jobs/imoveis-inativos`
  (header `x-cron-secret`), disparado por GitHub Actions (dia 1 de cada mês).
  Requer os secrets `API_BASE_URL` e `CRON_SECRET` no repositório e a variável
  `CRON_SECRET` na API.
