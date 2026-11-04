# Conta de demonstração (login sem SMS)

Uma conta para o app do cliente e outra para o Balcão, para apresentar o produto sem esperar SMS. Funciona em
produção, desligada por padrão.

## Como funciona

- Os dois celulares são **test phone numbers** do Supabase Auth: número fixo com código (OTP) fixo, sem SMS.
- O BFF (`apps/web/server`) tem `POST /api/auth/demo` com corpo `{ "surface": "customer" | "merchant" }`. Ele faz o
  mesmo `verifyOtp` do login normal e grava os mesmos cookies httpOnly. O token é um JWT real do Supabase: **a API
  continua sem bypass de autenticação**, mas reconhece o **lojista** demo na criação do clube: quando o hash do celular
  do JWT (`PiiService.hashPhone`, comparado em tempo constante) é o de `DEMO_MERCHANT_PHONE`, a loja nasce marcada
  `shops.is_demo` ([spec](../specs/demo-shop-hidden/spec.md)). O cliente demo não tem marca nenhuma.
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
- **A loja demo fica fora da vitrine:** não aparece no Descobrir (lista, trilhos, carrossel de destaque), no Hits (lista e
  banners), no ranking (visita feita nela não conta) nem em agregado da rede, e o admin não consegue dar destaque pago a
  ela. Ela continua funcionando de ponta a ponta para quem tem o QR ou o link: entrar no clube, QR da visita, código
  curto, Carteira, resgate no Balcão e indicação. O admin vê a loja na lista e no detalhe com `isDemo: true`.

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

   E no projeto da **API** (`apps/api`), também env de servidor:
   - `DEMO_MERCHANT_PHONE`: **o mesmo valor** de `NUXT_DEMO_MERCHANT_PHONE`. Se as duas forem diferentes (ou só a do web
     existir), a loja demo nasce pública. Formato inválido (com `55`, máscara ou espaço) derruba o boot da API; vazio
     desliga a marca.
   Faça novo deploy (web e API) para valer.
3. **Cliente:** abra `app.lagoamais.com.br/entrar`, toque no botão da demonstração e preencha um nome fictício (o número
   demo ainda não tem cadastro na primeira vez).
4. **Lojista:** abra `balcao.lagoamais.com.br/balcao/entrar`, toque no botão da demonstração. Na primeira vez cai no
   **Criar o clube**: crie a loja demo pelo fluxo normal (nome como "Loja Demonstração", programa de exemplo). Com o
   `DEMO_MERCHANT_PHONE` da API preenchido, ela já nasce marcada como demo. **Se a loja demo já existia antes desta
   marca** (ou foi criada com a env da API vazia), marque-a pelo script, primeiro no banco de teste e depois no de
   produção: `ALLOW_SHOP_ADMIN=1 pnpm --filter @lagoa/api shop:mark-demo --actor <apelido> --dry-run`, confira o id e o
   nome impressos, e rode de novo sem `--dry-run`. Nunca `UPDATE` à mão em produção.
5. **Confira no Supabase** (Authentication > Users) que as duas contas demo **não ganharam e-mail nem senha** (só o
   celular). Se ganharam, remova o e-mail/senha ou apague a conta e recrie.
6. **Rode o OTP periodicamente:** troque o OTP (Supabase + `NUXT_DEMO_OTP`) a cada algumas semanas, e a cada vez que
   a demo for divulgada fora do time. Revise a validade dos test numbers na mesma ocasião.

## Regras de operação

- **A loja demo só fica aprovada durante a apresentação.** O admin da rede aprova antes e **suspende logo depois**.
  O motivo deixou de ser "aparecer no Descobrir" (a marca `is_demo` já a tira de toda vitrine): agora é que **ninguém de
  fora entre no clube nem ganhe visita pelo QR da loja demo fotografado na apresentação**. Loja suspensa recusa entrar no
  clube, check-in e resgate como qualquer loja suspensa. (Regra atual; a troca por "pode ficar aprovada sempre" é
  decisão pendente do dono, decisão 9.5 da spec, e não depende de código.)
- **Limpe clientes reais da loja demo** antes e depois: qualquer cliente real que escaneie o QR da loja demo ou ganhe
  carimbo lá vira dado dentro de uma conta pública. A loja demo só deve ter clientes fictícios.
- **Não digite dados reais na conta de cliente demo** (nome, e-mail, aniversário, aviso/consentimento): qualquer
  pessoa que use o botão vê o que estiver lá. Use sempre nome fictício.
- **A loja demo fica fora do Descobrir, Hits, destaques, ranking e agregados da rede**, mas segue acessível por QR/link.
  O **cliente** demo ainda conta como cliente real: se ele aceitar o ranking e visitar loja real, aparece. **Não aceite o
  ranking na conta de cliente demo.**
- **Rode o `shop:mark-demo` antes de trocar o número demo.** Trocar `DEMO_MERCHANT_PHONE` não desmarca a loja antiga
  (a marca é permanente), mas o script só acha a loja do número atual: uma loja antiga ainda sem marca fica inalcançável
  por ele, e aí o caminho é suspendê-la.
- Reponha o cenário antes de cada apresentação: o lojista demo pode editar o programa e lançar visitas, e quem estiver
  na demo pode bagunçá-lo.

## Riscos

- **Qualquer pessoa que abrir a tela entra na conta demo.** Ela é pública por desenho. Por isso: nada de dado real nela.
  Trate tudo o que existir nessas duas contas como público.
- O mesmo número e código também funcionam pelo login normal (digitando o celular): o botão só tira o atrito. O
  segredo não é o código, é não haver nada sensível na conta. O teto por celular do login normal (5 códigos por janela)
  continua valendo ali e pode travar a digitação manual do número demo, mas não o botão.
- A conta de cliente demo é um cliente real para a API; a loja demo é real para quem chega pelo QR/link, mas não aparece
  em vitrine nem em agregado (ver "Regras de operação").
- Cliente real que chegou à loja demo (pelo QR fotografado) continua vendo o cartão dela na Carteira: a marca reduz a
  chance de alguém chegar lá, não a zera. Por isso continua valendo limpar clientes reais da loja demo.
- `DEMO_MERCHANT_PHONE` apontando para um celular real por engano só esconde a loja que esse celular **criar depois**
  (ou a que o script marcar); o boot nunca marca nem desmarca loja existente. Revise a env antes de salvar.

## Desligar

Apague as envs `NUXT_DEMO_*` na Vercel e faça novo deploy: a rota passa a responder 404 e os botões somem (para só uma
superfície, apague o celular dela). Para fechar de vez, remova também os test phone numbers no Supabase e apague (ou
suspenda) as contas demo.
