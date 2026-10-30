# Conta de demonstração (login sem SMS)

Uma conta para o app do cliente e outra para o Balcão, para apresentar o produto sem esperar SMS. Funciona em
produção, desligada por padrão.

## Como funciona

- Os dois celulares são **test phone numbers** do Supabase Auth: número fixo com código (OTP) fixo, sem SMS.
- O BFF (`apps/web/server`) tem `POST /api/auth/demo` com corpo `{ "surface": "customer" | "merchant" }`. Ele faz o
  mesmo `verifyOtp` do login normal e grava os mesmos cookies httpOnly. O token é um JWT real do Supabase: **a API não
  tem bypass nem sabe que a conta é demo**.
- `GET /api/auth/demo` devolve só `{ customer, merchant }` (booleanos). É o que faz os botões "Entrar na demonstração"
  aparecerem. O número e o código nunca saem do servidor.
- A rota só existe com as três envs válidas (`NUXT_DEMO_CUSTOMER_PHONE`, `NUXT_DEMO_MERCHANT_PHONE`, `NUXT_DEMO_OTP`).
  Sem elas: 404 e botões escondidos. As envs são `runtimeConfig` privado, nunca `public`.
- Com `NUXT_PUBLIC_CUSTOMER_URL` e `NUXT_PUBLIC_MERCHANT_URL` preenchidos, a conta do cliente só entra em `app.` e a
  do lojista só em `balcao.` (outro host: 404).
- Escrita exige `Origin` do próprio host (o middleware `origin-guard` já cobre `/api/**`).
- Entra no mesmo teto por celular do login (`POST /v1/auth/login-attempts`, fail-closed em produção). O teto é do
  número demo: quem abusar pode travar a demo por um tempo, mas não passa dele.
- Log de segurança: evento `auth.demoLogin` (sucesso/falha), sem celular, código nem token.

## Ativar (passo manual, feito pelo dono)

1. No painel do Supabase: **Authentication > Providers > Phone**, seção **Test Phone Numbers and OTPs**. Cadastre dois
   números com o mesmo código de 6 dígitos (ex.: `5567900000001=123456, 5567900000002=123456`). Use números que
   não sejam de ninguém e **não** use celular real. Há um prazo de validade por número (campo "Test OTPs valid until"):
   renove quando vencer.
2. Na Vercel (projeto `apps/web`), defina as envs de **servidor**, sem o prefixo `PUBLIC`:
   - `NUXT_DEMO_CUSTOMER_PHONE`: DDD + número, só dígitos, sem o `55` (ex.: `67900000001`)
   - `NUXT_DEMO_MERCHANT_PHONE`: idem, número diferente
   - `NUXT_DEMO_OTP`: o código de 6 dígitos cadastrado no passo 1
   Faça novo deploy para valer.
3. **Cliente:** abra `app.lagoamais.com.br/entrar`, toque em "Entrar na demonstração" e preencha o nome (o número demo
   ainda não tem cadastro na primeira vez). Depois use o app normalmente.
4. **Lojista:** abra `balcao.lagoamais.com.br/balcao/entrar` e toque em "Entrar na demonstração". Na primeira vez cai no
   **Criar o clube**: crie a loja demo pelo fluxo normal (nome como "Loja Demonstração", programa de exemplo).
   O plano e a aprovação seguem o fluxo normal: o admin da rede aprova a loja demo como qualquer outra (é preciso
   estar aprovada para lançar visita).
5. Para a demonstração completa, deixe a loja demo com algumas visitas e um prêmio, e o cartão do cliente demo com
   saldo (lance pelo Balcão).

## Riscos

- **Qualquer pessoa que abrir a tela entra na conta demo.** Ela é pública por desenho. Por isso: nada de dado real nela
  (sem celular, nome, e-mail ou foto de gente de verdade; a loja demo é fictícia). Trate tudo o que existir nessas
  duas contas como público.
- O mesmo número e código também funcionam pelo login normal (digitando o celular): o botão só tira o atrito. O
  segredo não é o código, é não haver nada sensível na conta.
- A conta demo é um lojista/cliente real para a API: ela aparece nas métricas da rede e (se aprovada) no Descobrir. Se
  não quiser a loja demo na vitrine, suspenda-a no painel do admin depois da apresentação.
- O lojista demo pode editar o programa e lançar visitas; quem estiver na demo pode bagunçar o cenário. Reponha antes de
  cada apresentação.
- O teto por celular protege contra força bruta, mas pode travar a demo para todos durante o bloqueio.

## Desligar

Apague as três envs (`NUXT_DEMO_*`) na Vercel e faça novo deploy: a rota passa a responder 404 e os botões somem.
Para fechar de vez, remova também os test phone numbers no Supabase e apague (ou suspenda) as contas demo.
