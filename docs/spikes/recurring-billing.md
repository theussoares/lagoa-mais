# Spike: cobrança recorrente das lojas

Data: 2026-10-29. Escopo: escolher o provedor para cobrar a mensalidade das lojas
(Fundador R$ 79,90 por 12 meses e depois R$ 159,90; Fundador Pro R$ 99,90). Sem
código de produção. Preços e regras vêm das páginas oficiais citadas no fim; onde
não consegui confirmar na fonte, está marcado como **(não confirmado)**.

## Recomendação

**Asaas.** Motivos:

1. Sem mensalidade nem taxa de adesão; paga-se só por cobrança (cartão recorrente,
   Pix, boleto), sem fixo mensal que pese com 10 lojas.
2. Reúne cartão, Pix, boleto, assinatura, Pix Automático (sem custo extra, preço do
   Pix) e NFS-e (R$ 0,49 por nota) num único contrato e numa única API. Lojista de
   comércio local paga muito por Pix e boleto; o cartão não pode ser a única porta.
3. Troca de preço aos 12 meses é um `PUT /v3/subscriptions/{id}` com o novo `value`
   (vale para as próximas cobranças), e webhooks por cobrança bastam para o nosso
   estado do plano.

O Stripe é a segunda opção (melhor API e melhor dunning), mas custa mais por cobrança,
não emite NFS-e e Pix no Brasil ainda aparece como "somente por convite". Se a rede
um dia cobrar de fora do Brasil ou quiser faturamento por uso, reavaliar.

## Comparativo

Valores de tabela pública (podem variar por conta/negociação). Ticket de referência
R$ 79,90.

| Item | Stripe | Asaas | Pagar.me | Iugu | Mercado Pago | Efí |
| --- | --- | --- | --- | --- | --- | --- |
| Cartão | 3,99% + R$ 0,39, mais 0,7% do Billing | R$ 0,49 + 1,99% (recorrente; a página lista duas faixas sem rótulo, uso a pior, 2,99%, nas contas) | 4,19% à vista (campanha) | 3,34% + R$ 0,40 (terceiro) | 3,99% a 4,99% conforme prazo de recebimento (blog oficial) | 3,49% à vista |
| Boleto | R$ 3,45 + 0,7% | R$ 0,79 ou R$ 1,59 (faixas sem rótulo) | n/d | R$ 2,19 + R$ 0,40 (terceiro) | disponível na assinatura, taxa n/d | R$ 3,45 |
| Pix | 1,19% (convite) + 0,7% | R$ 0,79 ou R$ 1,59 | 0,99% | 0,99% (terceiro) | a partir de 0,99% (terceiros) | 1,19% (cobrança) |
| Pix Automático | Changelog de abr/2026 diz que o Billing suporta; a página de Pix ainda indica restrição **(confirmar acesso)** | Sim, sem custo extra (preço do Pix) | n/d | n/d | n/d | Sim, R$ 3,50 por Pix liquidado |
| Mensalidade | Não | Não | Conta PJ grátis | Plano Essencial (valor n/d) | Não | Não |
| Assinatura nativa | Sim (Billing, o mais completo) | Sim (`/subscriptions`) | Sim (recorrência) | Sim (foco do produto) | Sim (`preapproval`, sem pausa) | Sim (recorrência grátis) |
| NFS-e | Não | Sim, R$ 0,49 por nota (exige PJ, inscrição municipal e homologação na prefeitura; MEI dispensa parte) | Não nativo | n/d | Não | Não |
| Dunning/retentativa | Smart Retries e regras configuráveis | Cobrança no vencimento; regra de nova tentativa de cartão não documentada nas páginas lidas **(confirmar)** | n/d | n/d | Limitado | Limitado |
| Webhooks | Assinados com HMAC (`Stripe-Signature`) | Header `asaas-access-token` (segredo compartilhado), at-least-once, `id` do evento para idempotência; fila pausa após 15 falhas | Sim | Sim | Sim | Sim |
| Sandbox | Sim | Sim (`sandbox.asaas.com`) | Sim | Sim | Sim | Sim |
| SDK Node | Oficial, tipado | Sem SDK oficial confirmado; REST simples | Oficial | n/d | Oficial | Oficial |
| KYC/CNPJ | CNPJ ou autônomo, análise do Stripe | PJ ou MEI; análise da conta | Exige CNPJ ativo ou MEI | PJ | PF ou PJ | PF ou PJ |
| Recebimento | Payouts contínuo, semanal ou mensal; prazo por método n/d | Pix/boleto rápido; **cartão cai em 32 dias** (CONFIRMED vira RECEIVED), antecipação paga | "Dia seguinte" (condição n/d) | Antecipação sob análise | 0, 14 ou 30 dias (define a taxa) | Boleto D+1; cartão até 31 dias |

Colunas marcadas "n/d" ou "terceiro": não achei na página oficial lida; a tabela da Iugu
veio de comparativo de terceiros (16/10/2026), e a página oficial não carregou.

## Custo estimado

Premissas: mix de pagamento 60% cartão, 30% Pix, 10% boleto; ticket R$ 79,90 (primeiros
12 meses); sem antecipação; boleto sem tabela vira Pix; Asaas pela faixa mais cara
listada em cartão (2,99%) e Pix/boleto R$ 1,59 no cálculo de 3,14 abaixo. Custo por mês,
em R$.

| Provedor | Por cobrança (mix) | 10 lojas | 50 lojas | 100 lojas |
| --- | --- | --- | --- | --- |
| Asaas (faixa baixa, 1,99% e R$ 0,79) | 2,36 | 24 | 118 | 236 |
| Asaas (faixa alta, 2,99% e R$ 1,59) | 3,14 | 31 | 157 | 314 |
| Asaas com NFS-e (faixa baixa) | 2,85 | 29 | 143 | 285 |
| Efí (Pix cobrança) | 2,30 | 23 | 115 | 230 |
| Efí (Pix Automático) | 3,07 | 31 | 153 | 307 |
| Iugu | 2,34 + mensalidade | 23 + plano | 117 + plano | 234 + plano |
| Pagar.me | 2,33 | 23 | 116 | 233 |
| Mercado Pago | 2,47 | 25 | 123 | 247 |
| Stripe | 3,34 | 33 | 167 | 334 |

Receita bruta de referência: 10 lojas = R$ 799, 50 = R$ 3.995, 100 = R$ 7.990. O custo
fica em 3% a 4% em todas; a diferença entre provedores é cerca de R$ 1 por loja.
O critério decisivo não é taxa, é o que vem junto (NFS-e, Pix Automático, sem mensalidade).

Depois de 12 meses (R$ 159,90): o custo percentual dobra. Cartão no Asaas passa a cerca
de R$ 5,27 por cobrança (2,99%); Pix/boleto continuam fixos. Vale incentivar Pix
Automático na renovação.

## Esboço de integração (padrão da API)

Módulo `apps/api/src/merchant/billing/`:

- `billing.controller.ts`: só HTTP. `GET /v1/merchant/billing` (situação do plano) e
  `POST /v1/merchant/billing/checkout` (cria a assinatura no provedor e devolve link
  de pagamento ou QR Pix). Filtra pelo `user.id` do JWT, nunca por id do cliente.
- `billing.service.ts`: orquestra e devolve `Result<T, DomainError>`; sem Drizzle e sem
  SDK direto.
- `billing.rules.ts`: decisão pura e testável sem banco: transição de estado, fim da promo,
  valor da próxima cobrança, carência.
- `billing.repository.ts` (classe abstrata) + `DrizzleBillingRepository`: tabelas abaixo.
- `billing-provider.ts` (classe abstrata) + `AsaasBillingProvider`: cria cliente e
  assinatura, atualiza `value`, cancela. Trocar de provedor é trocar essa implementação.
- `billing-webhook.controller.ts`: `@Public()` em `POST /v1/webhooks/asaas`.
  1. Compara `asaas-access-token` com o segredo (`timingSafeEqual`; o token de webhook
     não pode ser a chave da API). O Asaas não assina com HMAC, então o segredo
     compartilhado é a defesa; reforçar com allowlist de IPs oficiais se o deploy permitir
     e `@FailClosedThrottle()`.
  2. Valida o corpo com Zod tolerante a campos novos (campo desconhecido não pode lançar,
     senão a fila pausa).
  3. Grava o evento (`billing_events`, chave única no `id` do evento = idempotência) e
     responde 200 antes da regra pesada. Reprocessar o mesmo `id` é no-op.
  4. Aplica a regra em transação com `FOR UPDATE` na assinatura.
- Segredos só em env no servidor da API (`ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`); nada
  vai para o BFF/navegador. CPF/CNPJ e e-mail não entram em log.

### Tabelas (Drizzle)

- `billing_subscriptions`: `id`, `shop_id` (único), `plan` (`founder` | `founder_pro` |
  `standard`), `status`, `provider`, `provider_customer_id`, `provider_subscription_id`,
  `payment_method` (`card` | `pix` | `boleto`), `current_price_cents`,
  `promo_price_cents`, `regular_price_cents`, `promo_ends_at`, `current_period_end`,
  `grace_until`, `created_at`, `updated_at`.
- `billing_payments`: `id`, `subscription_id`, `provider_payment_id` (único), `amount_cents`,
  `status`, `due_date`, `paid_at`, `invoice_url`, `nfse_status`.
- `billing_events`: `provider_event_id` (único), `type`, `received_at`, `processed_at`.

### Estados do plano

`pending` (loja aprovada, sem pagamento) -> `active` (cobrança paga) -> `past_due`
(venceu; carência de N dias com tudo funcionando) -> `suspended` (carência esgotada:
loja deixa de gerar QR da visita, cliente continua vendo o cartão) -> `canceled`.
`past_due` e `suspended` voltam a `active` no pagamento. Não confundir com `shopStatus`
(`suspended` do glossário): cobrança tem regra própria em `billing.rules.ts`, com o
número de dias de carência em constante nomeada em `shared/`.

Mapa de eventos (Asaas): `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` -> `active`;
`PAYMENT_OVERDUE` -> `past_due`; remoção/inativação da assinatura -> `canceled`.
Cartão fica CONFIRMED e só vira RECEIVED em 32 dias: para liberar o plano, usar CONFIRMED.

### Promo de 12 meses

Modelar no nosso banco, não em cupom do provedor, porque o preço é regra de produto
(função pura em `shared/`, como `planEarning`).

- No checkout: assinatura criada com `value = promo_price_cents` (79,90) e
  `promo_ends_at = início + 12 meses`. `regular_price_cents` fica gravado (159,90).
- Ao confirmar a 12ª cobrança (webhook) ou por job diário, a regra
  `nextPriceFor(subscription, now)` devolve 159,90 quando `now >= promo_ends_at` e o
  service chama `PUT /v3/subscriptions/{id}` com o novo `value` (vale para as próximas
  cobranças; as já geradas só mudam com `updatePendingPayments: true`). O Asaas gera
  cobranças com antecedência (40 dias por padrão; há opção de 14 ou 7), então usar
  antecedência curta ou `updatePendingPayments` ao virar o preço.
- Cartão: mudar o valor de assinatura com cartão exige tokenização habilitada na conta
  (pedir ao suporte do Asaas em produção).
- Avisar o lojista 30 dias antes, porque o preço sobe 100%.
- **Conflito de produto**: o PRODUCT.md diz "preço travado e sem fidelidade" para o
  Fundador, e a tarefa fala em 159,90 após 12 meses. Precisa de decisão antes de implementar.

## Riscos

- **Recebimento do cartão em 32 dias** no Asaas: afeta caixa; Pix e boleto são rápidos.
  Mitigar empurrando Pix Automático e avaliando antecipação (cobrada à parte).
- **Webhook sem HMAC**: segredo vazado permite eventos forjados. Mitigar com token longo,
  rotação, comparação em tempo constante e confirmar o pagamento consultando a API do
  Asaas antes de mudar estado.
- **Fila pausada após 15 falhas** e entrega at-least-once: handler idempotente e rápido,
  alerta em log de erro, reprocesso pelos logs de webhook.
- **Dunning de cartão não documentado** nas páginas lidas (o Stripe é melhor aqui): cobrir
  com régua própria (e-mail aos 3 e 7 dias, carência, suspensão).
- **NFS-e**: exige inscrição municipal e homologação na prefeitura de Três Lagoas; regra e
  prazo do município **(não confirmados)**. Validar com o contador.
- **Pix Automático** é novo: adesão do banco do pagador varia; manter boleto e cartão como plano B.
- **Sem SDK oficial Node confirmado** no Asaas: escrever cliente fino tipado com Zod.
- **Lock-in**: mitigado pela interface `BillingProvider`.
- **Taxas lidas em página promocional** (Pagar.me em campanha; Asaas com faixas sem rótulo):
  pedir proposta por escrito antes de assinar.
- **LGPD**: dados de cobrança (CPF/CNPJ, e-mail) ficam no provedor; na nossa base, só ids e
  valores. O admin da rede continua vendo só agregados.

## Próximos passos

1. Decisão de produto: preço de Fundador "travado" versus 159,90 após 12 meses.
2. Abrir conta Asaas (CNPJ da Lagoa+), pedir proposta por escrito das taxas e a habilitação
   de tokenização e Pix Automático; perguntar a regra de retentativa de cartão.
3. Validar NFS-e com o contador (inscrição municipal, homologação).
4. Piloto no sandbox: criar assinatura, simular pagamento, receber webhook, trocar `value`.
5. ADR "Provedor de cobrança" a partir deste spike; depois spec em `docs/specs/billing/`.
6. Implementar `merchant/billing`, começando pelos testes de `billing.rules.ts`.

## Fontes

- Stripe Brasil, preços: https://stripe.com/br/pricing
- Stripe, assinaturas com Pix: https://docs.stripe.com/billing/subscriptions/pix
- Stripe, changelog Pix recorrente: https://docs.stripe.com/changelog/dahlia/2026-04-22/pix-recurring-payments-support
- Stripe, Pix: https://docs.stripe.com/payments/pix
- Asaas, preços: https://www.asaas.com/precos-e-taxas
- Asaas, assinaturas: https://docs.asaas.com/docs/assinaturas-recorrência
- Asaas, criar assinatura: https://docs.asaas.com/docs/criando-uma-assinatura
- Asaas, assinatura com cartão: https://docs.asaas.com/docs/criando-assinatura-com-cartao-de-credito
- Asaas, Pix Automático: https://docs.asaas.com/docs/pix-automatico
- Asaas, webhooks: https://docs.asaas.com/docs/webhook-para-cobrancas e https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook
- Asaas, nota fiscal: https://asaas.com/nota-fiscal
- Pagar.me, preços: https://www.pagar.me/precos
- Efí, tarifas: https://sejaefi.com.br/tarifas
- Iugu (terceiro, 16/10/2026): https://quasa.io/pt/media/asaas-ou-iugu-tarifa-publicada-vence-ate-o-volume-pedir-proposta
- Mercado Pago, recorrência: https://www.mercadopago.com.br/blog/como-receber-pagamentos-recorrentes e https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview
