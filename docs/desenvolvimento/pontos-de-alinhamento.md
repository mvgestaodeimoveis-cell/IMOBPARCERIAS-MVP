# Pontos de Alinhamento com o Cliente

Divergências e reforços encontrados ao cruzar a **proposta comercial** com o
**escopo do cliente v1.4**. Devem ser confirmados antes/no início da Sprint 1
(o próprio escopo do cliente pede esse alinhamento na Seção 9).

---

## 1. Verificação de CRECI: manual, não automática (no MVP)

- **Proposta comercial:** "integração com script open-source para validação
  automática do CRECI-BA".
- **Escopo do cliente v1.4:** verificação **manual** pela equipe (até 48h úteis);
  a automática via **API COFECI** é explicitamente **Fase 2** (Seção 6.2).
- **Decisão adotada:** implementar **verificação manual** na Sprint 1 (fila
  administrativa de aprovação). Alinhar com o cliente que a automação fica para depois.

## 2. Termo de Uso com assinatura eletrônica é obrigatório no MVP

- Não estava explícito na Sprint 1 da proposta.
- **Escopo do cliente (item 6.1 e Nota 17):** obrigatório, com registro de
  **IP + timestamp** armazenado permanentemente.
- **Decisão adotada:** incluído na Sprint 1.

## 3. Liberação de WhatsApp: gatilho é bilateral, não um único agendamento

- **Proposta comercial:** WhatsApp liberado "após a confirmação do agendamento".
- **Escopo do cliente (Fase 7 e Nota 16):** liberação só após **confirmação
  bilateral** — captador registra a **data da visita** E comprador insere o
  **CPF do cliente** (dois campos exclusivos, checagem dupla).
- **Impacto:** afeta a **Sprint 4**, não a Sprint 1, mas precisa ser desenhado
  corretamente desde já. É o principal mecanismo de proteção de receita da plataforma.

## 4. Cadastro de imóvel tem duas modalidades (manual + via link)

- O escopo do cliente v1.4 adiciona a **Modalidade B — Importação Assistida via
  link** (Seção 2.5), tratada como *best-effort* com **revisão humana obrigatória**.
- **Impacto:** **Sprint 2**. Recomenda-se suportar extração automática de **1 portal
  prioritário** no MVP; os demais entram como link de referência com preenchimento
  manual. Confirmar com o cliente qual é o portal prioritário da região.

## 5. Backend: Node.js (definido)

- A proposta oferecia "Kotlin com Spring Boot (ou Node.js)".
- **Definição do cliente/projeto:** **Node.js**. Adotado.

## 6. Perguntas em aberto para o cliente (Seção 9 do escopo)

- Existe base de código a reaproveitar ou o desenvolvimento parte do zero?
  (Assumindo **do zero** até confirmação.)
- Qual o **portal prioritário** para a importação via link (Sprint 2)?
- Qual o texto/versão oficial do **Termo de Uso** a ser exibido no cadastro?
