# Loja de demonstração fora da vitrine pública

Status: **decisão do dono aprovada** (esconder a loja demo); as decisões abertas estão na seção 9. Tamanho G (triagem do
tech-lead). Próximo passo: `arquiteto` (`solution-design.md`) → `cto`.

Lido antes de escrever: `CLAUDE.md`, `PRODUCT.md`, `EQUIPE.md`, `docs/security/demo-login.md`, `docs/database-model.md`,
`apps/api/src/merchant/club-setup/*`, `apps/api/src/common/pii.service.ts`, `apps/api/src/config/env.ts`,
`apps/api/src/database/schema/shops.ts`, `apps/api/src/database/{shop-status.cli,backfill-card-visits}.ts`,
`apps/api/src/customer/{discover,hits,ranking}/drizzle-*.repository.ts`, `apps/api/src/admin/{shops,featured}/*`,
`apps/api/src/featured/featured.rules.ts`, `apps/web/layers/customer/app/utils/discoverRails.ts`,
`apps/web/server/api/discover/*`, `apps/site/app/components/NetworkSection.vue`.

---

## 1. Motivo

A conta de demonstração do Balcão (`docs/security/demo-login.md`) cria uma loja de verdade pelo **Criar o clube**. Para a
API ela é uma loja como outra qualquer: aprovada, aparece no Descobrir, no Hits, no carrossel de destaque e conta no
ranking. Hoje a única proteção é operacional: o admin aprova antes da apresentação e suspende depois. Se alguém esquece de
suspender, o cliente real da cidade vê no app uma "Loja Demonstração", entra no clube dela e passa a ter dado pessoal
dentro de uma conta que qualquer pessoa abre pelo botão da demo.

**Decisão do dono (não se rediscute aqui):** a loja criada pelo celular demo nasce marcada (`shops.is_demo`) e fica
**fora de toda listagem pública e de todo agregado da rede**. Ela continua funcionando de ponta a ponta para quem tem o
QR ou o link direto, que é o que a apresentação usa.

## 2. Glossário novo (entra na tabela do `CLAUDE.md` antes de virar código)

| Domínio (pt-BR) | Código (en) | Observação |
| --- | --- | --- |
| Loja de demonstração (criada pelo celular demo; fora da vitrine e dos agregados) | `isDemo` (coluna `shops.is_demo`) / `demoShop` | Marca permanente; não é uma `shopStatus`. |
| Celular demo do lojista (env da API) | `DEMO_MERCHANT_PHONE` | Mesmo valor de `NUXT_DEMO_MERCHANT_PHONE` do web. |
| Marcar loja demo existente (script) | `shop:mark-demo` | Backfill da loja que nasceu antes da coluna. |

`is_demo` **não** vira um quarto valor de `shopStatus`: aprovação/suspensão continuam independentes (a demo precisa
ser aprovada para lançar visita na apresentação, e o admin continua podendo suspendê-la).

## 3. Escopo

1. Migration nova (`0030_shop_is_demo`, gerada pelo `db:generate`): `shops.is_demo boolean NOT NULL DEFAULT false`.
   Toda loja existente fica `false`.
2. Env de servidor da API `DEMO_MERCHANT_PHONE` (opcional, `apps/api/.env.example` e `env.ts`).
3. **Criar o clube** (`apps/api/src/merchant/club-setup`): ao **inserir** a loja, `is_demo = true` quando o hash do
   celular do JWT bate com o hash de `DEMO_MERCHANT_PHONE`.
4. Filtro `is_demo = false` nas leituras públicas e agregadas listadas na seção 5.
5. Destaque pago: a loja demo não é candidata nem pode receber destaque (admin).
6. Script `shop:mark-demo` para marcar a loja demo que já existe (backfill), seguindo o padrão de
   `shop-status.cli.ts`.
7. Atualizar `docs/security/demo-login.md`, `apps/api/.env.example`, `apps/api/README.md` (script) e o glossário do
   `CLAUDE.md`.

## 4. Fora do escopo (por decisão)

- **Conta de cliente demo.** Não ganha marca. Ela continua sendo um cliente real para a API (ranking incluído, se ela
  aceitar o ranking e tiver visita em loja real). Ver 9.4.
- **Esconder a demo dos fluxos de acesso direto:** QR da loja (`?loja=`), `POST /v1/shop-join`, `POST /v1/check-in` e
  `/check-in/code`, Carteira (`GET /v1/wallet/*`), Resgate (`/v1/redemptions`), Balcão (`merchant/counter`, QR da visita),
  Indicação (`/v1/referrals`). **Nenhum desses ganha filtro.**
- **Lista, detalhe, aprovação e suspensão de lojas no admin** (`admin/shops`): continuam enxergando a demo como hoje.
- **Moderação do Hits no admin** (`admin/hits`): o produto da demo continua na fila de moderação (é a mesma lógica da
  lista de lojas: o admin vê tudo o que existe). Ele só nunca chega à vitrine.
- Métricas do próprio lojista (Início, Clientes) da loja demo: são da loja, não da rede; seguem iguais.
- Tirar a marca de uma loja (desmarcar). Não há rota nem script para isso nesta entrega (ver regra RN-04).
- Aviso visual no painel do lojista demo ("sua loja não aparece no Descobrir"). Ver 9.3.
- Tela de admin: não existe front de admin neste repositório; esta feature **não tem tela nova**. O que muda no admin é
  só contrato de API (e só se 9.2 for aceita).
- Rotação do número demo: continua sendo o passo manual de `demo-login.md`; esta spec só define o que acontece com a loja
  antiga (RN-04).

## 5. Superfícies e efeito

### 5.1 Cliente (app `app.`)

| Leitura | Rota / onde | Efeito |
| --- | --- | --- |
| Lista do Descobrir (base de tudo da aba) | `GET /v1/discover/shops` → `DrizzleDiscoverRepository.listApprovedShops` | Sem a loja demo. Os trilhos **Dia surpresa**, **Cartão já começa andado**, o "resto da vitrine" e "lojas que você já conhece" são montados no front (`buildDiscoverRails`) a partir desta lista, então saem sem a demo sem mudança no front. |
| Carrossel de destaque do Descobrir | `GET /v1/discover/featured` → `listFeaturedShops` (grupo pago e grupo Pro) | Sem a loja demo nos **dois** grupos, mesmo com destaque pago vigente ou plano `founderPro`. |
| Hits (lista) | `GET /v1/hits` → `listFeed` | Sem produto da loja demo, mesmo aprovado. |
| Hits (banners) | `GET /v1/hits/banners` → `listPaidBannerItems` e `listProBannerItems` | Sem banner da loja demo (pago ou Pro). |
| Ranking da cidade | `GET /v1/ranking` → `DrizzleRankingRepository.topAndMe` e `visitsOf` | Visita feita em loja demo **não conta**, nem no top nem na linha "você". |
| Entrar no clube, check-in, Carteira, Cartão, Resgate, Indicação | rotas da seção 4 | **Sem mudança.** A demo aparece na Carteira de quem tem cartão nela. |

Os três filtros de Hits moram hoje num predicado único (`visible(now)` em `customer/hits/drizzle-hits.repository.ts`);
os do Descobrir, em `listApprovedShops` e nos dois `featuredGroup`. Confirmado que a LP (`apps/site`) não lê lojas da API
(o `NetworkSection` usa dados estáticos): nada a filtrar lá.

### 5.2 Lojista (Balcão `balcao.`)

- **Criar o clube** grava a marca (RN-01 a RN-03). Nenhuma tela muda; a resposta do `POST /v1/merchant/club-setup` e a
  sessão do lojista **não** expõem `isDemo` nesta entrega (9.3).
- Todo o resto do painel da loja demo funciona igual: Programa, Balcão, QR da visita, resgate, Clientes, Hits do
  lojista, cartaz.

### 5.3 Admin da rede

- `admin/shops` (lista, detalhe, ações): sem filtro. Recomendação 9.2: expor `isDemo` (só leitura) na lista e no
  detalhe para o admin entender por que a loja não aparece.
- `admin/featured`: a lista de candidatas Pro (`listProShops`) não traz a demo, e `planPlacement` recusa criar destaque
  para loja demo com `invalidTarget` (o mesmo erro de loja não aprovada). A lista de destaques já criados continua
  mostrando o que existir.
- **Métricas da rede:** não existe módulo hoje (o único número no admin é o do detalhe de **uma** loja, que fica como
  está). A regra RN-07 vale **já** como regra de contrato: todo agregado da rede criado daqui em diante filtra
  `is_demo = false`. Ela fica registrada aqui e no `database-model.md` para quem escrever o primeiro agregado.

## 6. Regras de negócio

- **RN-01 (quem é demo).** Uma loja é demo se, e só se, no momento da **inserção** pelo Criar o clube, o celular
  confirmado do JWT (`user.phone`, nunca o corpo) tem o mesmo `PiiService.hashPhone` que `DEMO_MERCHANT_PHONE`.
- **RN-02 (comparação).** A comparação é entre os dois hashes HMAC (32 bytes) com `crypto.timingSafeEqual`. O hash do
  número demo é calculado **uma vez** no boot; o celular demo em claro não fica em campo de classe além do necessário
  para calcular o hash, nunca entra em log, erro, métrica ou resposta. Nenhum log diz "loja demo criada" com celular;
  pode logar o `shopId` e `isDemo: true`.
- **RN-03 (env ausente ou vazia).** Sem `DEMO_MERCHANT_PHONE`, a API sobe normalmente e toda loja nasce
  `is_demo = false`. Valor presente mas fora do formato `PhoneNumber` (11 dígitos, DDD + 9, sem `55`): ver 9.1
  (recomendado: o boot recusa, como as outras envs).
- **RN-04 (marca permanente).** `is_demo` só vira `true` por dois caminhos: a inserção do Criar o clube (RN-01) e o
  script `shop:mark-demo` (RN-09). Nenhuma rota HTTP lê o valor do corpo nem muda a marca. Trocar o número demo **não**
  desmarca a loja antiga: ela continua escondida (se a rede quiser aposentá-la, suspende).
- **RN-05 (Criar o clube idempotente).** Quando o dono já tinha loja (`kind: 'existing'`), a chamada devolve a loja
  como está e **não** altera `is_demo`, nem para `true` nem para `false`.
- **RN-06 (listagem pública).** Toda leitura que lista lojas ou produtos para quem **não** chegou pela loja (vitrine,
  destaque, banner, trilho, ranking) exige `shops.is_demo = false`, além das condições que já existem
  (`status = 'approved'` etc.).
- **RN-07 (agregado da rede).** Todo número que soma lojas, clientes ou visitas **de mais de uma loja** (métricas da rede,
  contagem de vagas de Fundador/Fundador Pro, números públicos de LP, ranking) exige `is_demo = false`. Número de uma loja
  só (painel do lojista, detalhe de uma loja no admin) não filtra.
- **RN-08 (acesso direto não muda).** QR da loja, QR da visita, código curto, Carteira, Cartão, Resgate, Balcão e
  Indicação **não** olham `is_demo`. A loja demo se comporta nesses fluxos exatamente como uma loja real com a mesma
  `shopStatus` (suspensa continua recusando visita, como hoje).
- **RN-09 (backfill).** `pnpm shop:mark-demo` (mesmas travas do `shop:status`: `ALLOW_SHOP_ADMIN=1`, recusa em CI,
  `--actor <apelido>` obrigatório, `--dry-run`) lê `DEMO_MERCHANT_PHONE` e `PII_HASH_PEPPER` do ambiente, acha o
  `app_users` pelo `phone_hash` e a loja desse dono, e grava `is_demo = true`. Idempotente (rodar duas vezes não muda
  nada na segunda). Recusa e não grava se: env ausente/inválida, nenhum usuário com esse hash, usuário sem loja. Saída:
  `shopId`, nome da loja e "já estava marcada" ou "marcada"; nunca o celular. Não aceita `--shop` arbitrário (o alvo é
  sempre derivado do número demo, para não marcar loja real por engano de id).
- **RN-10 (destaque).** Loja demo não pode receber destaque pago (`planPlacement` → `invalidTarget`) e não aparece como
  candidata no admin. Destaque pago que exista antes do backfill fica no banco, ocupa vaga no admin como hoje (loja
  suspensa também ocupa), mas não aparece para o cliente (RN-06).
- **RN-11 (ranking).** No ranking, a visita conta só se `ledger_entries.shop_id` aponta para loja com `is_demo = false`.
  `topAndMe` e `visitsOf` usam o mesmo critério (senão a linha "você" mostraria um número diferente do top).

## 7. Critérios de aceite

Todos testáveis no `pnpm test:api` (unitário com fakes nas `*.rules.ts`/services; integração no Postgres de teste para
os repositories). O `TestDatabase` (`test-support/test-database.ts`) ganha a opção `isDemo` na criação de loja.

### 7.1 Criar o clube (lojista)

- **CA-01.** Dado `DEMO_MERCHANT_PHONE=67991234567` e um JWT com `phone` que normaliza para `67991234567`, quando o dono
  sem loja chama `POST /v1/merchant/club-setup`, então a loja criada tem `is_demo = true` no banco.
- **CA-02.** Dado o mesmo env e um JWT com outro celular, quando cria o clube, então `is_demo = false`.
- **CA-03.** Dado `DEMO_MERCHANT_PHONE` ausente (ou vazio), quando a API sobe, então o boot não falha; e quando o celular
  demo cria o clube, então `is_demo = false`.
- **CA-04.** Dado o JWT do celular demo e um corpo com qualquer campo extra (`isDemo: false`, `is_demo: true`), quando
  cria o clube, então o schema estrito recusa o campo ou ele é ignorado; a marca segue só a RN-01.
- **CA-05.** Dado que o dono demo já tem loja com `is_demo = false` (nascida antes da coluna), quando chama de novo o
  Criar o clube, então a resposta é a loja existente e `is_demo` continua `false` (RN-05; quem corrige é o script).
- **CA-06.** A regra pura (`isDemoOwner(phoneHash, demoPhoneHash | null)` ou equivalente) tem teste para: hash igual →
  `true`; diferente → `false`; demo `null` → `false`; e é implementada com `timingSafeEqual` (teste de revisão: o
  `code-reviewer`/`seguranca` confere que não há `===`/`equals` em string nem comparação do celular em claro).
- **CA-07.** Nos testes de log existentes do club-setup (ou novo), nenhuma linha emitida contém os dígitos do celular
  demo nem do celular do JWT.

### 7.2 Cliente

Cenário comum: loja A real e loja D demo, ambas `approved`, ambas `founderPro`, ambas com programa ativo com
boas-vindas > 0 e dia surpresa hoje, cada uma com um produto do Hits aprovado com foto, e destaque pago vigente em
`discoverCarousel` e em `hitsBanner` para as duas.

- **CA-10.** Quando o cliente chama `GET /v1/discover/shops`, então vem A e não vem D.
- **CA-11.** Quando chama `GET /v1/discover/featured`, então D não aparece nem como `sponsored: true` nem como Pro.
- **CA-12.** Quando chama `GET /v1/hits` (com e sem filtro de ramo, primeira página e página seguinte pelo cursor),
  então nenhum item de D aparece.
- **CA-13.** Quando chama `GET /v1/hits/banners`, então nenhum banner é de D (nem pago, nem Pro).
- **CA-14.** Dado um cliente com cartão em D, quando abre o Descobrir, então D não aparece em nenhum trilho nem em "lojas
  que você já conhece"; e quando abre `GET /v1/wallet/cards`, então o cartão de D aparece normalmente.
- **CA-15.** Dado o código da loja D, quando o cliente chama `POST /v1/shop-join`, então entra no clube (cartão zerado),
  igual à loja A.
- **CA-16.** Dado um QR da visita emitido por D, quando o cliente usa (`POST /v1/check-in` ou `/check-in/code`), então
  ganha como em A, com a mesma antifraude.
- **CA-17.** Dado um cartão em D com prêmio, quando o cliente gera o código de resgate e o Balcão de D valida e confirma,
  então o resgate funciona como em A.
- **CA-18.** Dado o link de indicação com o código de D, quando o amigo entra e faz a primeira visita, então a indicação
  é liquidada como em A.
- **CA-19.** Dados dois clientes no ranking, X com 3 visitas em A e Y com 5 visitas em D e 1 em A no mês, quando chamam
  `GET /v1/ranking`, então X aparece com 3 à frente de Y com 1, e a linha "você" de Y mostra 1.
- **CA-20.** Dada a loja D com `status = 'suspended'`, então os critérios CA-15 a CA-17 se comportam como em qualquer
  loja suspensa hoje (recusa), confirmando que `is_demo` não muda a regra de situação.

### 7.3 Admin

- **CA-30.** Quando o admin lista lojas (`GET /v1/admin/shops`, com e sem filtro de situação e de nome), então D aparece;
  e pode aprovar, suspender e reativar D como qualquer loja.
- **CA-31.** Quando o admin pede as candidatas a destaque, então D não está na lista.
- **CA-32.** Quando o admin tenta criar destaque (`POST /v1/admin/featured`) para D em qualquer vitrine, então recebe
  `invalidTarget` e nada é gravado.
- **CA-33.** Quando o admin lista a moderação do Hits, então os produtos pendentes de D aparecem (moderação não filtra).
- **CA-34.** (Só se 9.2 for aceita) A lista e o detalhe de lojas do admin trazem `isDemo: true` para D e `false` para A.

### 7.4 Backfill e operação

- **CA-40.** Dado no banco de teste uma loja do dono demo com `is_demo = false`, quando roda
  `ALLOW_SHOP_ADMIN=1 pnpm shop:mark-demo --actor po --dry-run`, então nada muda e a saída diz qual loja seria marcada
  (id e nome, sem celular).
- **CA-41.** Sem `--dry-run`, então `is_demo = true`; rodando de novo, a saída diz "já estava marcada" e nada muda.
- **CA-42.** Sem `ALLOW_SHOP_ADMIN=1`, com `CI` definido, sem `--actor`, sem `DEMO_MERCHANT_PHONE` ou sem usuário/loja
  para o número: o script sai com erro e não grava.
- **CA-43.** A migration `0030` aplicada num banco com lojas deixa todas com `is_demo = false` e `NOT NULL`.

### 7.5 Varredura (proteção contra esquecer filtro)

- **CA-50.** Existe um teste (unitário ou de integração) que, com o cenário do 7.2, chama **todas** as rotas públicas de
  listagem (`discover/shops`, `discover/featured`, `hits`, `hits/banners`, `ranking`) e falha se algum `shopId` de D
  aparecer. Rota pública de listagem nova entra nesse teste (mesma ideia do `admin-surface.sweep.test.ts`).

## 8. Casos de borda

1. **Loja demo já existe** (nasceu antes da coluna): fica `false` depois da migration e **continua visível** até o
   script rodar. Ordem de deploy: migration → API → `shop:mark-demo` no banco de teste → no de produção (seção 10).
   Recriar a loja não é opção prática: a conta do dono não pode ser apagada enquanto tem loja (`ownsShop`) e cartões,
   ledger e resgates apontam para ela.
2. **Env da API diferente da do web** (ou só uma das duas preenchida): a loja do celular demo nasce `false` e aparece.
   Mitigação: o passo de ativação em `demo-login.md` passa a exigir as duas iguais, e o script corrige depois.
3. **Número demo trocado** (rodízio): a loja antiga segue `is_demo = true` (RN-04). A conta nova cai no Criar o clube e
   a loja nova nasce marcada.
4. **Env apontando para celular real por engano:** só afeta loja **criada** depois disso por aquele celular (e o script,
   se rodado). Loja real já existente nunca é desmarcada nem marcada pelo boot. Risco aceito, mitigado pela revisão da env.
5. **Cliente real com cartão na demo:** continua vendo e usando o cartão na Carteira (RN-08). A regra de operação
   "limpe clientes reais da loja demo" continua valendo; esta feature reduz a chance de alguém chegar lá, não a zera
   (o QR da loja demo pode ser fotografado na apresentação).
6. **Carimbo que vence, prêmio guardado 30 dias, código de resgate expirado ou já usado, janela de check-in:** sem
   mudança; a demo segue as mesmas regras de qualquer loja (RN-08).
7. **Loja demo `pending`:** já não aparece em nada público (filtro de `approved`); `is_demo` não muda isso. O admin
   aprova como hoje.
8. **Destaque pago da demo criado antes do backfill:** some do app assim que a marca entra; no admin continua listado e
   ocupando vaga até vencer ou ser cancelado (RN-10).
9. **Indicação para a loja demo:** funciona (fora do filtro por decisão do dono), e o `+1` cai no cartão da demo.
10. **Cliente sem consentimento de avisos / campanhas:** Campanhas não têm API ainda (M5). Quando tiverem, a loja demo
    só alcança os próprios clientes, como qualquer loja; nada muda aqui.
11. **Lojas Fundador (10 primeiras):** não há contagem de vagas no código hoje. Quando houver, ela é um agregado da rede
    e a demo não ocupa vaga (RN-07).
12. **Cache:** as rotas do cliente são SSR por pedido sem cache no BFF; a marca vale na próxima leitura.

## 9. Decisões abertas (com recomendação)

**9.1 Env com formato inválido.** `DEMO_MERCHANT_PHONE` presente mas fora do formato.
- (a) Boot recusa (`Invalid environment: DEMO_MERCHANT_PHONE`), como as outras envs.
- (b) Boot sobe, loga aviso sem o valor e trata como ausente.
- **Recomendo (a).** O pedido é "não quebra **sem** ela"; com valor errado, (b) faz a loja demo nascer pública em
  silêncio, que é exatamente o que a feature evita. Vazio (`DEMO_MERCHANT_PHONE=`) conta como ausente.

**9.2 Admin enxerga a marca?**
- (a) `isDemo` só leitura na lista e no detalhe de `admin/shops` (contrato de API; tela fica para quando o admin existir).
- (b) Não expor nada.
- **Recomendo (a).** Sem isso o admin vê a loja aprovada, não a acha no Descobrir e não sabe por quê. Não é dado pessoal.

**9.3 Lojista demo sabe que está escondido?**
- (a) `isDemo` na sessão do lojista e um aviso no Início ("Loja de demonstração: não aparece no Descobrir nem no Hits").
- (b) Nada nesta entrega.
- **Recomendo (b) agora, (a) depois.** Quem usa a conta demo é o time na apresentação; um aviso no Início apareceria na
  frente do lojista convidado e atrapalharia a demonstração. Revisitar se a demo for usada sem alguém do time.

**9.4 Cliente demo no ranking.** O cliente demo continua contando se aceitar o ranking e visitar loja real.
- (a) Fora do escopo (só a loja ganha marca).
- (b) Marcar também o cliente demo (`DEMO_CUSTOMER_PHONE` na API) e tirá-lo do ranking.
- **Recomendo (a)**, alinhado à decisão do dono (a marca é da loja). Visita do cliente demo na loja demo já sai do
  ranking pela RN-11. Registrar em `demo-login.md`: não aceitar o ranking na conta de cliente demo.

**9.5 Regra "a loja demo só fica aprovada durante a apresentação".**
- (a) Mantém: aprovar antes, suspender depois.
- (b) Pode ficar aprovada sempre, já que não aparece mais na vitrine.
- **Recomendo (b), com a regra de limpar clientes reais mantida.** O motivo principal da suspensão (aparecer no
  Descobrir) deixa de existir; o risco que sobra (alguém com foto do QR da loja demo entrar no clube) não é resolvido
  pela suspensão de forma confiável e se trata pela limpeza. Decisão do dono; muda o texto de `demo-login.md`.

**9.6 Auditoria do script.** `shop_status_events` hoje só registra situação e plano.
- (a) Só a saída do terminal (como `backfill-card-visits`).
- (b) Linha de auditoria (tabela de eventos ou coluna `demo_marked_at`).
- **Recomendo (a).** É uma operação única e rara; (b) fica para o arquiteto se o `cto` quiser trilha.

## 10. Impacto em LGPD e segurança

- O celular demo é um número de teste (não de pessoa), mas a regra do projeto vale igual: **nunca em log, URL, erro ou
  métrica**; só o hash HMAC é comparado (RN-02). `DEMO_MERCHANT_PHONE` é env de servidor da API, nunca vai para o web
  nem para `public`.
- A feature **reduz** exposição: menos clientes reais chegam a uma conta pública.
- Nada muda no que o admin vê de dado pessoal (continua só agregado e o detalhe mascarado que já existe).
- Revisão obrigatória por `seguranca` (toca a criação do clube a partir do JWT) e `code-reviewer` (comparação em tempo
  constante, ausência de log do celular, varredura de filtros).

**Ordem de implantação** (o `infra` confirma):
1. Migration `0030` só pelo `db:migrate:prod`, depois do banco de teste com os testes de integração passando.
2. Deploy da API com o filtro e a env `DEMO_MERCHANT_PHONE` (igual a `NUXT_DEMO_MERCHANT_PHONE`).
3. `shop:mark-demo --dry-run` e depois sem `--dry-run`, primeiro no banco de teste, depois em produção, pelo dono.
   Nunca `UPDATE` à mão em produção.
4. Conferir no app (Descobrir, Hits, destaque) que a demo sumiu e que o QR da loja demo ainda faz entrar no clube.

## 11. Documentos a atualizar no mesmo PR

- `docs/security/demo-login.md`:
  - "**a API não tem bypass nem sabe que a conta é demo**" → a API continua sem bypass de autenticação, mas reconhece o
    **lojista** demo na criação do clube (por hash do celular, `DEMO_MERCHANT_PHONE`) e marca a loja `is_demo`.
  - "**A demo entra em métricas e ranking da rede**" → a **loja** demo fica fora do Descobrir, Hits, destaques, ranking
    e agregados da rede, mas segue acessível por QR/link; o **cliente** demo ainda conta como cliente real (9.4).
  - Item 2 de "Ativar": acrescentar `DEMO_MERCHANT_PHONE` no projeto da API, com o mesmo valor do web.
  - Item 4: se a loja demo já existia antes desta entrega, rodar `shop:mark-demo`.
  - "Regras de operação" e "Riscos": conforme 9.5 e 9.4.
- `apps/api/.env.example` e `apps/api/README.md` (env e script).
- `CLAUDE.md`: glossário (seção 2) e uma frase no padrão da API: "listagem pública e agregado da rede filtram
  `shops.is_demo = false`".
- `docs/database-model.md`: coluna `is_demo` e a RN-07 para o futuro módulo de métricas.
