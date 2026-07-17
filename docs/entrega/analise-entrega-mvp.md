# Imob Parcerias — Análise da Entrega do MVP

> **Documento de acompanhamento** — o que foi entregue frente ao Escopo Técnico do MVP
> (v1.4), pendências que dependem de decisão comercial e os limites da infraestrutura
> gratuita atual.
> **Data:** 2026-07-14 · **Base:** repositório `mvgestaodeimoveis-cell/IMOBPARCERIAS-MVP`, branch `main`.

---

## 1. Resumo executivo

O MVP está **funcionalmente completo** em relação ao escopo v1.4: as **9 fases** do fluxo
operacional (da captação do imóvel ao fechamento da venda), a **vitrine com 3 níveis de
acesso**, o **princípio de simetria** (visita pelo captador + CPF pelo comprador), o
**contrato de parceria digital**, o **chat interno mediado**, o **painel administrativo** e
as **rotinas automáticas** (jobs) estão implementados, testados e versionados.

Restam **dois pontos que não são de programação**, mas de **decisão/contratação**, antes de
operar em produção com volume real:

1. **Provedor de WhatsApp** — o código já dispara as notificações, mas o envio real por
   WhatsApp depende de contratar um provedor (**não existe opção gratuita confiável**). Hoje
   as notificações por **e-mail funcionam**; o WhatsApp fica em modo "simulado" (registra em
   log) até o provedor ser definido.
2. **Infraestrutura em plano gratuito** — atende com folga as **metas do 1º mês** (100
   corretores / 300–400 imóveis), mas tem limites técnicos (cold start, pausa por
   inatividade, cotas mensais) que exigem **migração para planos pagos** conforme o uso cresce.

---

## 2. Entrega frente ao escopo — funcionalidades obrigatórias (Seção 6.1)

Legenda: ✅ Entregue · ⚙️ Entregue, requer configuração externa · 🟡 Parcial/manual (conforme o MVP prevê)

| # | Funcionalidade (escopo 6.1) | Status | Observações da entrega |
|---|---|---|---|
| 1 | Cadastro de corretor (nome, CRECI, WhatsApp, e-mail, cidade) | ✅ | Cadastro em etapas, com verificação de e-mail opcional (double opt-in). |
| 2 | Verificação manual de CRECI (equipe, até 48h) | ✅ | Fluxo de aprovação no painel admin; status do perfil controla o acesso. |
| 3 | Termo de Uso com assinatura eletrônica (clique + IP + timestamp) | ✅ | Registro permanente; Termo de Uso e Política de Privacidade oficiais publicados. |
| 4 | Cadastro de imóvel — Modalidade Manual | ✅ | Formulário guiado (wizard) com campos condicionais por tipo. |
| 5 | Cadastro de imóvel — Modalidade via Link (importação assistida) | ⚙️ | Extração best-effort com **revisão humana obrigatória** antes de publicar (conforme a ressalva do escopo). Depende de os portais exporem os dados. |
| 6 | Upload de fotos com mínimo de 5 | ⚙️ | Implementado; o armazenamento de imagens usa **Cloudinary** (requer credenciais — ver §5). |
| 7 | Chave única de identificação por tipo | ✅ | Lógica condicional por tipo (apto/casa/condomínio/terreno/comercial), ancorada em CEP + número. |
| 8 | Detecção de duplicata exata e possível | ✅ | Bloqueio automático na duplicata exata; alerta com confirmação manual na possível. |
| 9 | Upload de contrato de exclusividade (com vencimento) | ✅ | Status "Verificação Pendente" → aprovação pela equipe; badge de exclusividade na vitrine. |
| 10 | Vitrine com filtros (tipo, bairro, preço, metragem) — Nível 1 | ✅ | Filtros acessíveis (rótulos + chips); endereço nunca exposto publicamente. |
| 11 | Solicitação de parceria com declaração de cliente | ✅ | Nome do cliente + confirmação de perfil de busca. |
| 12 | Geração automática de contrato de parceria | ✅ | Versão inicial no match e **versão final** após a confirmação bilateral. |
| 13 | Chat interno mediado | ✅ | Liberado no match aceito; histórico permanente (evidência jurídica). |
| 14 | Confirmação bilateral de visita (simétrica) | ✅ | Captador registra a visita; comprador insere o CPF (com validação de dígitos). |
| 15 | Controle de status do imóvel (Disponível/Em negociação/Vendido/Inativo) | ✅ | Transições automáticas conforme o mapa de status (Seção 4). |
| 16 | Job mensal de verificação de atualização | ✅ | Dia 1: dois avisos escalonados + inativação automática. |
| 17 | Alerta de vencimento de exclusividade (15 dias antes) | ✅ | Rotina diária dedicada. |
| 18 | Fila de espera em imóveis "Em negociação" | ✅ | Enfileiramento automático; notificação quando o imóvel volta a Disponível. |
| 19 | **Notificações via WhatsApp e e-mail (todos os gatilhos)** | 🟡 | **E-mail: funcionando.** **WhatsApp: pendente de provedor** (ver §4). O código já dispara nos dois canais; o WhatsApp fica em modo simulado sem o provedor. |
| 20 | Declaração de venda e cálculo da taxa (5% / 10% da comissão) | ✅ | Cálculo automático; breakdown exibido na parceria. |
| 21 | Cobrança via PIX manual (chave + 15 dias, confirmação pela equipe) | ⚙️ | Fluxo completo; a **chave PIX real** é configuração (variável de ambiente). |
| 22 | Avaliação mútua pós-venda (1–5 estrelas + comentário) | ✅ | Desbloqueada após a confirmação do pagamento. |

**Resultado:** todas as 22 funcionalidades obrigatórias estão implementadas. Os itens ⚙️
dependem apenas de **configuração externa** (credenciais/chaves), e o item 🟡 (WhatsApp)
depende da **contratação de um provedor**.

---

## 3. Entrega frente ao escopo — as 9 fases do fluxo (Seção 3)

| Fase | Descrição | Status |
|---|---|---|
| 1 | Onboarding do corretor-captador (cadastro, CRECI, Termo de Uso) | ✅ |
| 2 | Cadastro do imóvel (manual **e** via link, mínimo de 5 fotos, chave única, exclusividade) | ✅ / ⚙️ (fotos via Cloudinary) |
| 3 | Manutenção mensal (avisos escalonados, inativação automática) | ✅ |
| 4 | Onboarding do corretor-comprador (vitrine livre + cadastro para solicitar parceria) | ✅ |
| 5 | Busca na vitrine e apresentação ao cliente | ✅ |
| 6 | Solicitação de parceria + contrato digital (janela de 180 dias) | ✅ |
| 7 | Chat interno + confirmação bilateral da visita | ✅ |
| 8 | Fechamento da venda (comissão, taxa, PIX, avaliação) | ✅ / ⚙️ (chave PIX) |
| 9 | Negociação encerrada sem venda (volta a Disponível, fila, janela de 180 dias) | ✅ |

**KPIs do MVP (Seção 1.6):** o painel administrativo já expõe todos os indicadores de meta —
corretores ativos, imóveis na vitrine, parcerias iniciadas, confirmações bilaterais, vendas
declaradas, financeiro e **taxa de abandono no cadastro** — permitindo acompanhar as metas do
1º mês diretamente pelo dashboard.

---

## 4. Pendência crítica — Provedor de WhatsApp

### 4.1 Situação atual
- O escopo exige **notificações por WhatsApp e e-mail em todos os gatilhos** do fluxo.
- **E-mail:** já funciona (via Resend no plano gratuito — ver §5).
- **WhatsApp:** o código **já está pronto** e dispara a mensagem em cada gatilho, mas o envio
  real depende de um **provedor externo**. Sem as credenciais do provedor, o sistema registra
  a mensagem no log (modo simulado) e **não interrompe o fluxo** — ou seja, nada quebra, mas a
  mensagem não chega ao WhatsApp do corretor.
- Ativar é só preencher duas variáveis de ambiente (`WHATSAPP_API_URL` e `WHATSAPP_API_TOKEN`)
  assim que o provedor for contratado — **não há novo desenvolvimento** para o caso padrão.

### 4.2 Por que não existe opção gratuita
Enviar mensagens de WhatsApp **de forma programática e legal** exige a **WhatsApp Business
Platform** (API oficial da Meta). Não existe um caminho gratuito e sustentável para isso:

- **API Oficial da Meta (Cloud API):** a Meta **cobra por conversa/mensagem** iniciada pela
  empresa (categorias *utilidade*, *marketing* e *autenticação*). As mensagens de
  *utilidade/serviço* têm faixa gratuita limitada, mas as notificações proativas do nosso
  fluxo (ex.: "sua parceria foi aceita", "taxa a pagar via PIX") são **cobradas por unidade**.
- **Provedores intermediários (BSPs)** — Twilio, Zenvia, Gupshup, 360dialog, etc.: cobram
  **mensalidade + custo por mensagem**, além do repasse do custo da Meta.
- **Soluções "não oficiais"** (bibliotecas que automatizam o WhatsApp comum): **violam os
  Termos de Uso** do WhatsApp e resultam em **banimento do número** — inviáveis para um
  produto comercial.

### 4.3 Implicação de custo (ordem de grandeza)
Os valores exatos dependem do provedor e do câmbio, mas para dimensionar a decisão:

- Há tipicamente um **custo por mensagem/conversa** (centavos a alguns centavos de real por
  notificação de utilidade) **somado** a uma **mensalidade** ou taxa de plataforma do BSP.
- Também há **custo de setup**: verificação do número de negócio, aprovação da conta e
  **templates de mensagem pré-aprovados pela Meta** (notificações proativas exigem template
  aprovado — não é texto livre).

> **Recomendação:** tratar o WhatsApp como **item de custo recorrente do negócio**, não como
> infraestrutura gratuita. Para o volume do 1º mês (dezenas de corretores, poucas parcerias),
> o custo tende a ser **baixo**, mas é **não-nulo**. Sugerimos escolher **um BSP** (pela
> facilidade de aprovação de número/template) e começar com os gatilhos **essenciais**
> (parceria aceita, contato liberado, cobrança PIX) para conter custo.
>
> **Enquanto o provedor não é definido**, o produto opera com **notificações por e-mail** — o
> fluxo funciona ponta a ponta; apenas o canal WhatsApp fica inativo.

---

## 5. Limitações da infraestrutura gratuita

A plataforma roda hoje 100% em **planos gratuitos**, com titularidade das contas na empresa:

| Camada | Serviço | Plano | Papel |
|---|---|---|---|
| Site (frontend) | **Vercel** | Hobby (grátis) | Hospeda o Next.js e o proxy para a API |
| API (backend) | **Render** | Free | Hospeda a API Node/Express |
| Banco de dados | **Neon** | Free | PostgreSQL |
| Imagens | **Cloudinary** | Free | Armazena e serve as fotos dos imóveis |
| E-mails | **Resend** | Free | Envio de e-mails transacionais |
| DNS/Domínio | **Cloudflare** | Free (+ registro do domínio) | DNS e domínio |

> ⚠️ Os limites abaixo são **valores de referência** dos planos gratuitos e **podem mudar**
> conforme a política de cada provedor. Servem para dimensionar capacidade e planejar quando
> migrar para o pago.

### 5.1 Limites técnicos por serviço

**Render (API) — Free**
- Instância pequena e compartilhada (**~512 MB de RAM, CPU fracionada**).
- **"Dorme" após ~15 min sem uso** → a primeira requisição depois disso demora alguns segundos
  (*cold start*). Isso afeta a percepção de velocidade em horários de baixo movimento.
- Cota mensal de horas de execução (suficiente para 1 serviço rodando).
- **Impacto prático:** ótimo para validar o MVP; ruim para uma experiência "sempre instantânea".
  O primeiro upgrade recomendado costuma ser **manter a API acordada** (plano pago do Render).

**Neon (PostgreSQL) — Free**
- **Armazenamento de ~0,5 GB** e **cota mensal de horas de computação** (o banco também
  suspende quando ocioso e "acorda" na primeira consulta).
- Como as **fotos ficam no Cloudinary** (fora do banco), o banco guarda **apenas texto**
  (cadastros, imóveis, parcerias, mensagens). Texto ocupa pouquíssimo espaço — **0,5 GB
  comporta centenas de milhares de registros**, muito além das metas do MVP.
- **Impacto prático:** o gargalo do Neon gratuito **não é o espaço**, e sim as horas de
  computação e a suspensão por ociosidade (somada ao cold start do Render).

**Cloudinary (fotos) — Free**
- Cota mensal combinada de **armazenamento + transferência (banda) + transformações** (o
  chamado "crédito" mensal).
- Cada imóvel exige **no mínimo 5 fotos**. O consumo cresce com o **número de imóveis** (armazenamento)
  e, principalmente, com o **número de visualizações da vitrine** (banda).
- **Impacto prático:** é a camada gratuita que **satura primeiro** conforme a audiência cresce,
  porque a banda é consumida a cada visita à vitrine. É a candidata natural ao primeiro upgrade
  pago quando o tráfego aumentar.

**Vercel (site) — Hobby**
- Cota mensal de **banda (~100 GB)** e de execução de funções; **destinado a uso pessoal/
  não-comercial** nos termos do plano Hobby.
- **Impacto prático:** aguenta bem o tráfego do MVP, mas o uso **comercial** pede o plano
  **Pro** para estar em conformidade com os termos (e liberar colaboração em equipe).

**Resend (e-mails) — Free**
- Da ordem de **~3.000 e-mails/mês** e **~100 e-mails/dia**, com **1 domínio verificado**.
- **Impacto prático:** cobre o MVP com folga; se as notificações por e-mail crescerem muito
  (muitos corretores × muitos gatilhos), pode encostar no limite diário.

### 5.2 Quantos usuários e imóveis a infra gratuita suporta?

**Conclusão:** a infraestrutura gratuita **atende com folga as metas do 1º mês** definidas no
escopo (Seção 1.6):

- **100 corretores** cadastrados;
- **300–400 imóveis** na vitrine;
- dezenas de parcerias e o tráfego correspondente de um lançamento regional.

Nesse patamar, **nenhum limite de armazenamento é atingido** (o banco fica com uma fração de
0,5 GB; as ~2.000 fotos de 400 imóveis cabem no crédito inicial do Cloudinary). O que se sente
**não é falta de capacidade de dados, e sim de desempenho e disponibilidade**:

1. **Cold start** (Render + Neon acordando) → lentidão na 1ª requisição após ociosidade.
2. **Banda do Cloudinary** → é o primeiro recurso a saturar quando a **vitrine passa a receber
   muitas visitas** (cada foto exibida consome cota).
3. **Cota diária de e-mail** (Resend) → se muitos gatilhos dispararem no mesmo dia.

**Faixa de referência para planejar o upgrade:** o modelo gratuito tende a se manter
confortável **até a ordem de ~100–200 corretores ativos e algumas centenas de imóveis com
tráfego moderado**. A partir daí — ou quando o produto precisar de **resposta sempre
instantânea** (sem cold start) e **uso comercial em conformidade** — recomenda-se migrar,
nesta ordem de prioridade:

1. **Cloudinary** (ou storage de imagens equivalente) — quando a banda de fotos apertar;
2. **Render** (plano pago) — para eliminar o cold start da API;
3. **Vercel Pro** — conformidade comercial + colaboração de equipe;
4. **Neon** (plano pago) — quando as horas de computação ou o espaço apertarem;
5. **Resend** (plano pago) — se o volume de e-mail crescer;
6. **WhatsApp (BSP/Meta)** — custo recorrente **desde o momento em que for ativado** (ver §4).

> Observação: os gargalos do gratuito são **de desempenho e cota mensal**, não de perda de
> dados — nada é apagado ao atingir um limite; o serviço apenas **desacelera, pausa por
> ociosidade ou bloqueia envios** até a virada do mês ou o upgrade.

---

## 6. Recomendações finais

1. **Lançar o MVP no gratuito** para validar as metas do 1º mês — a capacidade é suficiente.
2. **Notificações:** operar com **e-mail** de imediato; **definir o provedor de WhatsApp** e
   ativá-lo quando houver orçamento — é **custo recorrente do negócio**, sem alternativa
   gratuita confiável.
3. **Configurações externas pendentes** (não são desenvolvimento): credenciais do **Cloudinary**
   (fotos), **chave PIX** real (cobrança), domínio do **Resend** verificado (e-mails reais) e,
   opcionalmente, o **login com Google**.
4. **Planejar o upgrade pago** acompanhando dois sinais: **cold start incomodando** os usuários
   e **cota de banda de fotos** se aproximando do limite — nessa ordem.
