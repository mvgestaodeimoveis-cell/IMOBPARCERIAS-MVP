# Contas e Acessos para o Deploy — Imob Parcerias

Guia para o cliente: quais contas criar para colocar a plataforma no ar e como
dar acesso ao desenvolvedor. Todas na fase inicial ficam em **plano gratuito**
(só o domínio é anual).

> **Princípio:** **todas** as contas são criadas **no nome/propriedade da empresa**
> (e-mail e cartão da empresa). Assim a titularidade da infraestrutura é sempre de vocês.
> O desenvolvedor não cria nada — apenas **configura e opera** com o acesso que vocês concederem.

> **Dica importante:** crie um **e-mail administrativo dedicado** (ex.:
> `admin@imobparcerias.com.br` ou um Gmail da empresa) e use ele para cadastrar
> **todas** as contas abaixo. Isso centraliza o controle e facilita recuperar acesso.

---

## Visão geral

| Serviço | Para quê | Plano | Custo | Dá para me adicionar como membro? |
|---|---|---|---|---|
| **GitHub** | Guardar o código-fonte | Free | R$ 0 | ✅ Sim (colaboradores ilimitados) |
| **Neon** | Banco de dados PostgreSQL | Free | R$ 0 | ✅ Sim (membros da organização) |
| **Vercel** | Hospedar o site (frontend) | Hobby | R$ 0 | ❌ Não no free → **login compartilhado** |
| **Render** | Hospedar a API (backend) | Hobby | R$ 0 | ❌ Não no free (1 assento) → **login compartilhado** |
| **Resend** | Envio de e-mails | Free | R$ 0 | ➖ Não precisa: me passar a **API key** |
| **Cloudflare** | Domínio e DNS | Free | ~custo do registro | ✅ Já concedido (acesso via membro) |

---

## Como dar acesso ao desenvolvedor, serviço por serviço

### 1. GitHub — código-fonte ✅ (adiciona como colaborador)
O repositório já existe: `mvgestaodeimoveis-cell/IMOBPARCERIAS-MVP`.
1. Acesse o repositório → **Settings** → **Collaborators**.
2. Clique em **Add people** e informe o meu usuário do GitHub (eu te envio).
3. Selecione a permissão **Write** (ou **Maintain**).

> Não precisa compartilhar senha — o convite é individual e seguro.

### 2. Neon — banco de dados ✅ (convida para a organização)
1. Crie a conta em **https://neon.tech** com o e-mail da empresa.
2. No console, sua **organização** já é criada automaticamente.
3. Vá em **Organization → Members → Invite** e convide o meu e-mail (eu te envio)
   com o papel **Member** (ou **Admin**).

> No plano free a gestão de membros funciona; só o gerenciamento de faturamento é pago.

### 3. Vercel — hospedagem do site ❌ (login compartilhado)
O plano **Hobby (gratuito) não permite adicionar membros** — colaboração em equipe
só existe no **Pro** (US$ 20/mês por desenvolvedor). Além disso, o Hobby é oficialmente
para **uso pessoal/não-comercial**.
1. Crie a conta em **https://vercel.com** com o **e-mail administrativo da empresa**.
2. Defina uma **senha forte** e **ative o 2FA**.
3. Me passe **usuário (e-mail) e senha** por um canal seguro (ver seção de Segurança).

> O passo a passo técnico de configuração (conectar o GitHub e publicar) está em
> `deploy-vercel-render.md` — faço isso dentro da conta de vocês com o acesso compartilhado.
> **Opção futura:** assinar o **Vercel Pro** e me adicionar como membro (aí sem senha compartilhada).

### 4. Render — hospedagem da API ❌ (login compartilhado)
O plano **Hobby (gratuito) tem apenas 1 assento** de equipe — membros ilimitados
só no **Pro** (US$ 25/mês).
1. Crie a conta em **https://render.com** com o e-mail administrativo da empresa.
2. Senha forte + **2FA** ativado.
3. Me passe **usuário e senha** por canal seguro.

### 5. Resend — envio de e-mails ➖ (me passar a API key)
Aqui **não precisa me dar acesso ao painel**. O envio de e-mails funciona só com uma chave.
1. Crie a conta em **https://resend.com** com o e-mail da empresa.
2. Em **Domains**, adicione e **verifique o domínio** (`imobparcerias.com.br`)
   — o Resend mostra alguns registros DNS para adicionar no **Cloudflare** (eu cuido disso).
3. Em **API Keys**, gere uma chave e me envie o valor (**RESEND_API_KEY**) por canal seguro.

> Se preferir, você também pode me convidar como membro do time no Resend, mas
> não é necessário — a API key já basta para o sistema enviar e-mails.

### 6. Cloudflare — domínio e DNS ✅ (acesso já concedido)
Você já me adicionou como **membro** da conta Cloudflare — não precisa fazer mais nada aqui.
Eu configuro o **DNS** (apontar o site e a API) e a verificação de domínio do e-mail (Resend)
diretamente por lá.

> O Cloudflare cuida do **DNS** e, se o domínio estiver registrado nele, também do domínio.
> Se o domínio estiver registrado em outro lugar, basta apontar os *nameservers* para o
> Cloudflare (eu indico o passo a passo, se for o caso).

---

## Segurança ao compartilhar acessos (login e segredos)

Você vai compartilhar comigo **logins** (Vercel, Render) e **segredos** (ex.: `RESEND_API_KEY`).
Para fazer isso com segurança:

1. **Não envie senha/chave em texto puro** por WhatsApp ou e-mail comum.
2. Use um **gerenciador de senhas** (Bitwarden, 1Password, Google Password Manager) e
   compartilhe o item comigo; ou um link de uso único (ex.: `https://pwpush.com`).
3. **Ative o 2FA** nas contas e guarde os **códigos de recuperação**.
4. Use uma **senha exclusiva** por conta (não reaproveite senhas).
5. Ao fim do projeto (ou ao migrar para Pro), **troque a senha** para revogar meu acesso.
   Chaves de API também podem ser **revogadas e regeradas** a qualquer momento.

---

## Checklist — o que me enviar no final

- [ ] **GitHub:** convite de colaborador aceito (você adiciona meu usuário).
- [ ] **Neon:** convite de membro na organização + confirmação de acesso.
- [ ] **Vercel:** e-mail + senha do acesso compartilhado (via gerenciador de senhas).
- [ ] **Render:** e-mail + senha do acesso compartilhado (via gerenciador de senhas).
- [ ] **Resend:** `RESEND_API_KEY` + domínio verificado.
- [x] **Cloudflare:** acesso via membro já concedido (DNS/domínio).
- [ ] **Domínio definido:** `imobparcerias.com.br` (ou o escolhido) já registrado.

> Assim que eu tiver esses acessos, conecto os ambientes e coloco a versão no ar.
