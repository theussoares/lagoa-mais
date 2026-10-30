# Conta de demonstração (login sem SMS)

Uma conta para o app do cliente e outra para o Balcão, para apresentar o produto sem esperar SMS. Funciona em
produção, desligada por padrão.

## Como funciona

- Os dois celulares são **test phone numbers** do Supabase Auth: número fixo com código (OTP) fixo, sem SMS.
- O BFF (`apps/web/server`) tem `POST /api/auth/demo` com corpo `{ "surface": "customer" | "merchant" }`. Ele faz o
  mesmo `verifyOtp` do login normal e grava os mesmos cookies httpOnly. O token é um JWT real do Supabase: **a API não
  tem bypass nem sabe que a conta é demo**.
- `GET /api/auth/demo` devolve só `{ customer, merchant }` (booleanos). É o que faz os botões "Entrar na conta pública de
  demonstração" aparecerem. O número e o código nunca saem do servidor.
- **Cada superfície liga sozinha.** O cliente liga com `NUXT_DEMO_CUSTOMER_PHONE` + `NUXT_DEMO_OTP`; o lojista, com
  `NUXT_DEMO_MERCHANT_PHONE` + `NUXT_DEMO_OTP`. Sem o par da superfície: 404 e botão escondido só dela. `NUXT_DEMO_OTP`
  é comum às duas. As envs são `runtimeConfig` privado, nunca `public`.
- Com `NUXT_PUBLIC_CUSTOMER_URL` e `NUXT_PUBLIC_MERCHANT_URL` preenchidos, a conta do cliente só entra em `app.` e a
  do lojista só em `balcao.` (outro host: 404).
- Escrita exige `Origin` do próprio host (o middleware `origin-guard` cobre `/api/**`); sem `Origin` válido: 403.
- **Teto por IP do cliente**, em contador próprio (`POST /v1/auth/demo-login-attempts`, só com o `BFF_SHARED_SECRET`,
  chave `demo-login:<hash do IP>`, 10 entradas por 15 min por IP, fail-closed: contador fora do ar = recusa). Não há teto por
  celular: o número demo é público e um teto por ele travaria a demo para todos.
- Log de segurança: evento `auth.demoLogin` (sucesso/falha), sem celular, código nem token.

## Ativar (passo manual, feito pelo dono)

1. No painel do Supabase: **Authentication > Providers > Phone**, seção **Test Phone Numbers and OTPs**. Cadastre os
   números de teste com um OTP de 6 dígitos. **Use números e OTP aleatórios**, nunca sequenciais nem óbvios
   (nada de `...0001`/`...0002` ou `123456`): gere ao acaso (ex.: `openssl rand`), com DDD válido e o formato
   `9XXXXXXXX`, e que não sejam de ninguém. Não use celular real. Há uma validade por número ("Test OTPs valid
   until"): renove quando vencer.
2. Na Vercel (projeto `apps/web`), defina as envs de **servidor**, sem o prefixo `PUBLIC`:
   - `NUXT_DEMO_CUSTOMER_PHONE`: DDD + número, só dígitos, sem o `55`
   - `NUXT_DEMO_MERCHANT_PHONE`: idem, número diferente
   - `NUXT_DEMO_OTP`: o código de 6 dígitos cadastrado no passo 1
   Faça novo deploy para valer.
3. **Cliente:** abra `app.lagoamais.com.br/entrar`, toque no botão da demonstração e preencha um nome fictício (o número
   demo ainda não tem cadastro na primeira vez).
4. **Lojista:** abra `balcao.lagoamais.com.br/balcao/entrar`, toque no botão da demonstração. Na primeira vez cai no
   **Criar o clube**: crie a loja demo pelo fluxo normal (nome como "Loja Demonstração", programa de exemplo).
5. **Confira no Supabase** (Authentication > Users) que as duas contas demo **não ganharam e-mail nem senha** (só o
   celular). Se ganharam, remova o e-mail/senha ou apague a conta e recrie.
6. **Rode o OTP periodicamente:** troque o OTP (Supabase + `NUXT_DEMO_OTP`) a cada algumas semanas, e a cada vez que
   a demo for divulgada fora do time. Revise a validade dos test numbers na mesma ocasião.

## Regras de operação

- **A loja demo só fica aprovada durante a apresentação.** O admin da rede aprova antes e **suspende logo depois**:
  fora desse período ela não aparece no Descobrir nem lança visita.
- **Limpe clientes reais da loja demo** antes e depois: qualquer cliente real que escaneie o QR da loja demo ou ganhe
  carimbo lá vira dado dentro de uma conta pública. A loja demo só deve ter clientes fictícios.
- **Não digite dados reais na conta de cliente demo** (nome, e-mail, aniversário, aviso/consentimento): qualquer
  pessoa que use o botão vê o que estiver lá. Use sempre nome fictício.
- **A demo entra em métricas e ranking da rede** (a loja demo e o cliente demo contam como lojas/clientes reais para a
  API). Considere isso ao ler números, e suspenda a loja depois da apresentação.
- Reponha o cenário antes de cada apresentação: o lojista demo pode editar o programa e lançar visitas, e quem estiver
  na demo pode bagunçá-lo.

## Riscos

- **Qualquer pessoa que abrir a tela entra na conta demo.** Ela é pública por desenho. Por isso: nada de dado real nela.
  Trate tudo o que existir nessas duas contas como público.
- O mesmo número e código também funcionam pelo login normal (digitando o celular): o botão só tira o atrito. O
  segredo não é o código, é não haver nada sensível na conta. O teto por celular do login normal (5 códigos por janela)
  continua valendo ali e pode travar a digitação manual do número demo, mas não o botão.
- A conta demo é um lojista/cliente real para a API (ver "Regras de operação").

## Desligar

Apague as envs `NUXT_DEMO_*` na Vercel e faça novo deploy: a rota passa a responder 404 e os botões somem (para só uma
superfície, apague o celular dela). Para fechar de vez, remova também os test phone numbers no Supabase e apague (ou
suspenda) as contas demo.
