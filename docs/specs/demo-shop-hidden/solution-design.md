# Solution design: loja de demonstração fora da vitrine pública

Status: **aprovado com ajustes pelo `cto`** (ajustes já aplicados neste arquivo, marcados com "Ajuste CTO"). Spec:
[`spec.md`](./spec.md) (aprovada pelo PO). Tamanho G.

Decisões abertas da spec adotadas aqui (instrução do tech-lead): **9.1 (a)** env inválida derruba o boot; **9.2 (a)**
admin vê `isDemo` só leitura; **9.3 (b)** sem aviso ao lojista demo; **9.4 (a)** cliente demo fora do escopo; **9.6 (a)**
script só com saída no terminal. **9.5 fica com o dono**: nada no código depende dela (seção 9).

Lido antes de escrever: `CLAUDE.md`, `EQUIPE.md`, `docs/database-model.md`, `docs/security/SECURITY_RULES.md`,
`docs/security/demo-login.md`, e o código citado em cada seção abaixo (club-setup, `PiiService`, `env.ts`, schema `shops`,
`shop-status{,.cli}.ts`, repositories de discover/hits/ranking, admin shops/featured, `featured.rules.ts`,
`test-support/test-database.ts`, `admin-surface.sweep.test.ts`).

---

## 1. Resumo da solução

- Uma coluna `shops.is_demo boolean NOT NULL DEFAULT false` (migration `0030_shop_is_demo`).
- **Um único filtro** em `apps/api/src/shops/listed-shop.ts` (`notDemoShop()` e `listedShop()`), usado por toda leitura
  pública e por todo agregado da rede. Nenhum repository escreve `is_demo` à mão.
- O Criar o clube recebe uma peça nova, `DemoMerchant` (provider Nest), que calcula **no boot** o HMAC do
  `DEMO_MERCHANT_PHONE` e compara com o hash do celular do JWT por `timingSafeEqual` (regra pura `isDemoOwner`). A marca
  entra no `INSERT` da loja; o `ON CONFLICT DO NOTHING` que já existe garante que loja existente nunca muda (RN-05).
- Script `shop:mark-demo` para o backfill, no molde de `shop-status{,.cli}.ts`.
- Admin: `isDemo` só leitura em `admin/shops`; `admin/featured` não lista nem aceita a demo.
- **Front (`apps/web`, `apps/site`): nenhum arquivo muda.** O que muda para o cliente é só quantos itens as listas
  trazem; os schemas de resposta são os mesmos.

## 2. Front: layers, SSR, i18n (explícito, porque nada muda)

| Item | Decisão |
| --- | --- |
| Layers (`core`, `ui`, `customer`, `merchant`, `admin`) | Nenhuma mudança. `buildDiscoverRails` monta os trilhos a partir de `GET /discover/shops`, então a demo some sem tocar o front. |
| Services/stores/composables | Nenhum novo. Não existe `isDemo` em nenhum contrato que o web consome (9.3 b). |
| Smart × dumb | Não há tela nova nem componente novo. |
| Chaves i18n | **Nenhuma.** |
| SSR | Inalterado: Descobrir e Vitrine (Hits) continuam SSR por pedido (`useAsyncQuery`), painel do lojista continua SPA (`ssr: false`). Sem cache no BFF: a marca vale na próxima leitura (spec 8.12). |
| BFF (`apps/web/server/api/**`) | Nenhuma rota nova nem alterada; as respostas validadas pelos schemas do `shared` continuam válidas. |
| Mock do lojista (`NUXT_PUBLIC_MERCHANT_BACKEND=mock`) | Não muda: o mock não expõe `isDemo` e não lista vitrine. |
| `apps/site` (LP) | Não lê lojas da API (`NetworkSection` é estático). Nada a filtrar. |
| `NUXT_DEMO_MERCHANT_PHONE` (web) | Continua só no web. A API ganha a sua própria env (`DEMO_MERCHANT_PHONE`); o valor igual nas duas é passo de operação documentado em `demo-login.md`. |

## 3. Contratos

### 3.1 `shared/` (só uma mudança)

`shared/schemas/admin.ts` (trilha C):

```ts
export const AdminShopRowSchema = z.object({
  // ...campos atuais...
  /** Loja de demonstração (`shops.is_demo`): fora da vitrine e dos agregados da rede. Só leitura; nenhuma rota muda. */
  isDemo: z.boolean(),
})
```

`AdminShopDetailSchema` estende a linha, então o detalhe ganha `isDemo` sem outra mudança. Nenhum consumidor no web
(não existe front de admin). Nada mais vai para `shared/`: a marca é decisão de servidor e não é contrato do cliente nem
do lojista. Nenhuma constante de domínio nova (não há número envolvido).

### 3.2 Filtro único (trilha A1, consumido por B e C)

`apps/api/src/shops/listed-shop.ts` (novo):

```ts
/** RN-06/RN-07: a loja de demonstração nunca entra em listagem pública nem em agregado da rede. */
export function notDemoShop(): SQL            // "shops"."is_demo" = false
/** Loja que pode aparecer para quem não chegou por ela: aprovada e não demo. */
export function listedShop(): SQL             // ("shops"."status" = 'approved' and "shops"."is_demo" = false)
```

- Funções (não constantes de módulo): cada consulta recebe um `SQL` novo, sem objeto compartilhado entre queries.
- `listedShop()` monta com `sql\`(${eq(...)} and ${notDemoShop()})\`` para devolver `SQL` (o `and()` do Drizzle devolve
  `SQL | undefined`, e o padrão proíbe `!`/`as`).
- Referenciam a tabela `shops` sem alias. Quem usa SQL cru (ranking) faz `join ${shops} on ...` sem alias para o
  fragmento casar.
- Regra para o futuro (vai para o `CLAUDE.md`): **toda leitura que lista loja/produto para quem não chegou pela loja usa
  `listedShop()`; todo número de mais de uma loja usa `notDemoShop()`**. Acesso direto (RN-08) não usa nenhum dos dois.

### 3.3 Env da API (trilha A)

`apps/api/src/config/env.ts`:

```ts
/** Celular do lojista demo (mesmo valor de NUXT_DEMO_MERCHANT_PHONE). Só o hash é usado; vazio = ausente. */
DEMO_MERCHANT_PHONE: z.preprocess((value) => (value === '' ? undefined : value), PhoneNumberSchema.optional()),
```

- Ausente ou vazia: `undefined`, a API sobe e nenhuma loja nasce demo (RN-03, CA-03).
- Presente e fora de `^[1-9]{2}9\d{8}$` (com `55`, com máscara, com espaço): boot recusa com
  `Invalid environment: DEMO_MERCHANT_PHONE` (9.1 a). O `parseEnv` já só imprime o **caminho** do campo, nunca o valor.
- Não é obrigatória em produção (não entra no `superRefine`).
- O dev confere no `env.test.ts` que a combinação `preprocess` + `optional` do Zod 4 aceita a chave ausente; se não
  aceitar, a alternativa é `z.union([z.literal(''), PhoneNumberSchema]).optional().transform(...)`, mesma semântica.

### 3.4 Club-setup (trilha A)

`club-setup.rules.ts` (regra pura):

```ts
/** RN-01/RN-02: compara os dois HMAC em tempo constante; sem número demo configurado, ninguém é demo. */
export function isDemoOwner(ownerPhoneHash: Buffer, demoPhoneHash: Buffer | null): boolean
```

- `demoPhoneHash === null` → `false`. Comprimentos diferentes → `false` antes do `timingSafeEqual` (que lança com
  tamanhos diferentes; o tamanho de um HMAC-SHA256 é público, 32 bytes, então o early return não vaza nada). Nunca
  `===`, `equals`, `Buffer.compare` nem comparação do celular em claro.

`demo-merchant.ts` (novo, provider):

```ts
@Injectable()
export class DemoMerchant {
  private readonly phoneHash: Buffer | null          // único campo; o celular em claro não é guardado
  constructor(@Inject(ENV) env: Pick<Env, 'DEMO_MERCHANT_PHONE'>, pii: PiiService)
  /** O dono (pelo hash do celular do JWT) é o lojista demo? */
  owns(ownerPhoneHash: Buffer): boolean               // = isDemoOwner(ownerPhoneHash, this.phoneHash)
}
```

- Hash calculado uma vez, na construção do singleton (boot). Usa o mesmo `PiiService.hashPhone` do cadastro: o hash do
  número demo é byte a byte o `app_users.phone_hash` do dono demo, o que também serve ao script.
- Registrado em `ClubSetupModule.providers`. `ENV` e `PiiService` já são globais.
- Mora em `merchant/club-setup` porque só o Criar o clube usa. Se outra superfície precisar (ex.: 9.3 a no futuro), sobe
  para `common/`.

`club-setup.repository.ts`:

```ts
/** Marcas gravadas só no INSERT da loja; loja existente nunca é alterada (RN-04/RN-05). */
export interface NewShopMarks {
  readonly isDemo: boolean
}

export interface CreatedClub {
  // ...campos atuais...
  readonly isDemo: boolean                            // lido do banco (inserida ou existente)
}

abstract createClub(owner: NewAppUser, draft: ClubSetupDraft, newCheckInCode: () => string, now: Date, marks: NewShopMarks): Promise<CreateClubOutcome>
```

`drizzle-club-setup.repository.ts`: `isDemo: marks.isDemo` no `.values(...)` do `insert(shops)`; `isDemo: shops.isDemo`
no `returning` e no `select` do caminho `existing`. O `onConflictDoNothing({ target: shops.ownerUserId })` já existente é
o que garante a RN-05: a segunda chamada não executa `UPDATE` nenhum.

`club-setup.service.ts`:

- Construtor: `(repo, pii, clock, demoMerchant: DemoMerchant)`.
- `createClub`: calcula `phoneHash` **uma vez** (hoje é calculado inline no objeto `owner`), reusa no `owner` e em
  `marks = { isDemo: this.demoMerchant.owns(phoneHash) }`.
- `ClubCreation`/`MerchantSession` **não** ganham `isDemo` (9.3 b): a resposta do `POST /v1/merchant/club-setup` é a de hoje.
- Log: uma linha `Logger.log` só quando `kind === 'created' && club.isDemo`, com texto
  `Demo shop created: <shopId>` (spec RN-02 permite `shopId` e a marca). Nada de celular, hash ou nome do dono.
- O corpo continua `ClubSetupDraftSchema` (`z.object`, não estrito): campo extra (`isDemo`, `is_demo`) é descartado
  pelo Zod antes do service (CA-04 "ignorado"). Não tornamos o schema estrito nesta entrega, para não arriscar o web que
  já envia o rascunho; o teste de CA-04 prova que a marca segue só o JWT.

### 3.5 Script `shop:mark-demo` (trilha A)

`apps/api/src/database/shop-mark-demo.ts` (lógica, testável contra o banco):

```ts
export type MarkDemoShopOutcome =
  | { readonly kind: 'marked' | 'alreadyMarked' | 'wouldMark'; readonly shopId: string; readonly shopName: string }
  | { readonly kind: 'userNotFound' | 'shopNotFound' }

/** Numa transação: acha o dono pelo `phone_hash`, trava a loja dele (`FOR UPDATE`) e liga `is_demo`. Idempotente. */
export async function markDemoShop(db: Pick<Database, 'transaction'>, demoPhoneHash: Buffer, options: { readonly dryRun: boolean }): Promise<MarkDemoShopOutcome>
```

`apps/api/src/database/shop-mark-demo.cli.ts` (argv/env/saída):

```ts
/** Travas de operação, puras: ALLOW_SHOP_ADMIN=1, fora de CI, --actor válido, sem --shop. Mensagem de erro sem valor de env. */
export function parseMarkDemoInvocation(argv: readonly string[], env: NodeJS.ProcessEnv): Result<{ readonly actor: string; readonly dryRun: boolean }, string>
```

- Fluxo do `main`: `parseMarkDemoInvocation` → `parseEnv(process.env)` (valida `DATABASE_URL`, `PII_*` e o formato do
  `DEMO_MERCHANT_PHONE`) → `DEMO_MERCHANT_PHONE` ausente = erro `Refusing to run: DEMO_MERCHANT_PHONE is not set` →
  `new PiiService(env).hashPhone(...)` → `markDemoShop` → uma linha no terminal → `client.end()`.
- `--actor` usa a mesma validação do `shop:status`: exportar de `shop-status.ts` um
  `isValidActorNickname(nickname: string): boolean` (hoje é a const `ACTOR` privada) e usar nos dois. O apelido só
  aparece na saída do terminal (9.6 a: sem tabela de auditoria).
- `--shop` presente = erro (`--shop is not accepted: the target comes from DEMO_MERCHANT_PHONE`).
- Ajuste CTO: `wouldMark` só quando a loja ainda está `false`; no `--dry-run` sobre loja já marcada o resultado é
  `alreadyMarked` (a saída do dry-run não pode prometer uma mudança que não vai acontecer). O `FOR UPDATE` vale também no
  dry-run (mesma leitura, transação sem escrita), para o caminho ser um só.
- Saída (inglês, como `shop:status`): `Dry run: would mark shop <id> "<nome>" as demo`, `Shop <id> "<nome>": marked as
  demo (actor <apelido>)`, `Shop <id> "<nome>": already marked, nothing changed`. Erros: `Not changed: userNotFound` /
  `Not changed: shopNotFound`, `exitCode = 1`. **Nunca** o celular nem o hash.
- `apps/api/package.json`: `"shop:mark-demo": "node --env-file-if-exists=.env --require @swc-node/register src/database/shop-mark-demo.cli.ts"`.
  Uso: `ALLOW_SHOP_ADMIN=1 pnpm --filter @lagoa/api shop:mark-demo --actor <apelido> [--dry-run]`.

### 3.6 Admin featured (trilha C)

`apps/api/src/featured/featured.rules.ts`:

```ts
export interface PlacementTarget {
  // ...campos atuais...
  /** Loja de demonstração: nunca recebe destaque (RN-10). */
  readonly shopIsDemo: boolean
}
// planPlacement: if (input.shopStatus !== 'approved' || input.shopIsDemo) return err({ code: 'invalidTarget' })
```

- `featured.repository.ts`: `PlacementSnapshot = Pick<PlacementTarget, 'shopStatus' | 'shopIsDemo' | 'hitItem' | 'existing'>`.
- `drizzle-featured.repository.ts`: no `create`, ler `isDemo: shops.isDemo` junto com `status` (já dentro da transação e
  depois do advisory lock) e repassar ao `decide`. `listProShops`: `and(eq(shops.plan, 'founderPro'), listedShop())`.
  `list` e `activePeriods` **não** mudam (destaque da demo criado antes do backfill continua listado e ocupando vaga, RN-10).

### 3.7 Admin shops (trilha C)

- `shops.repository.ts`: `AdminShopRecord.isDemo: boolean`.
- `drizzle-shops.repository.ts`: `LIST_COLUMNS.isDemo = shops.isDemo`. Nenhum filtro novo (CA-30).
- `shops.service.ts`: `toRow` copia `isDemo`. O detalhe herda.
- Nenhuma ação nova: não há como ligar/desligar a marca pelo admin (RN-04).

### 3.8 Leituras do cliente (trilha B)

| Arquivo | Mudança |
| --- | --- |
| `customer/discover/drizzle-discover.repository.ts` | `listApprovedShops`: `.where(listedShop())`. `listFeaturedShops`: os dois grupos trocam `eq(shops.status, 'approved')` por `listedShop()` (pago e Pro). |
| `customer/hits/drizzle-hits.repository.ts` | `visible(now)`: troca `eq(shops.status, 'approved')` por `listedShop()`. Cobre `listFeed`, `listPaidBannerItems` (filtro está no subselect `oldest_per_shop`) e `listProBannerItems`. Comentário do `visible` passa a dizer "loja listada (aprovada e não demo)". |
| `customer/ranking/drizzle-ranking.repository.ts` | `topAndMe` (SQL cru): `join ${shops} on ${shops.id} = l.shop_id and ${notDemoShop()}` no CTE `scores`. `visitsOf`: `.innerJoin(shops, and(eq(shops.id, ledgerEntries.shopId), notDemoShop()))`. Mesmo critério nos dois (RN-11). |

Services, controllers e schemas de resposta do cliente não mudam. `wallet`, `shop-join`, `check-in`, `redemption`,
`referral` **não** são tocados (RN-08); o filtro `eq(shops.status, 'approved')` deles fica como está.

## 4. Endpoints

Nenhum endpoint novo. Mudanças de comportamento/contrato:

| Método e rota (API) | Payload | Resposta | Erros | Mudança |
| --- | --- | --- | --- | --- |
| `POST /v1/merchant/club-setup` | `ClubSetupDraft` (igual) | `MerchantSession` + `created` (igual) | iguais (`unauthorized`, `phoneAlreadyUsed`) | Loja nasce `is_demo = true` se o celular do JWT for o demo. Nada exposto. |
| `GET /v1/discover/shops` | — | `ShopSummary[]` (igual) | iguais | Sem loja demo. |
| `GET /v1/discover/featured` | — | `FeaturedShop[]` (igual) | iguais | Sem demo no grupo pago nem no Pro. |
| `GET /v1/discover/challenges` | — | `Challenge[]` (hoje `[]`) | — | Nada hoje; entra na varredura para quando existir. |
| `GET /v1/hits?group=&cursor=` | — | `PublicHitItemPage` (igual) | iguais | Sem produto da demo, em toda página. |
| `GET /v1/hits/banners` | — | `HitsBanner[]` (igual) | iguais | Sem banner da demo (pago ou Pro). |
| `GET /v1/customer/ranking` | — | `Ranking` (igual) | iguais | Visita em loja demo não conta (top e `me.visits`). |
| `GET /v1/admin/shops` | query igual | `AdminShopList`, cada linha com `isDemo: boolean` | iguais | Campo novo, só leitura; sem filtro. |
| `GET /v1/admin/shops/:id` | — | `AdminShopDetail` com `isDemo` | iguais | Campo novo. |
| `GET /v1/admin/featured` | query igual | `AdminFeaturedList` | iguais | `proShops` sem a demo. |
| `POST /v1/admin/featured` | `FeaturedPlacementDraft` (igual) | `AdminPlacement` | `invalidTarget` também para loja demo (mesmo status HTTP de hoje) | Recusa a demo, nada gravado. |

Rotas do BFF (`/api/...`) não mudam.

## 5. Banco

- `apps/api/src/database/schema/shops.ts`: depois de `plan`,
  `isDemo: boolean('is_demo').notNull().default(false)` com comentário: "Loja de demonstração (Criar o clube pelo
  `DEMO_MERCHANT_PHONE` ou `shop:mark-demo`): fora da vitrine e dos agregados. Só liga, nunca desliga (RN-04)."
- Migration gerada: `pnpm --filter @lagoa/api db:generate --name shop_is_demo` → `apps/api/drizzle/0030_shop_is_demo.sql`
  (esperado: `ALTER TABLE "shops" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;`), mais
  `drizzle/meta/_journal.json` e `drizzle/meta/0030_snapshot.json`. Conferir que o SQL gerado é só essa linha.
- Postgres 11+: `ADD COLUMN ... DEFAULT <constante> NOT NULL` não reescreve a tabela; todas as linhas leem `false` (CA-43).
- RLS: a tabela já tem RLS ligado sem policy pública (`0001_enable_rls`); coluna nova não muda isso.
- **Sem índice novo.** `shops` tem dezenas/centenas de linhas; o predicado booleano se resolve junto do `status` (que já
  tem `shops_status_idx`) ou no join por PK. Revisitar só se `shops` passar de milhares de linhas.
- Produção só por `db:migrate:prod` depois do banco de teste com as migrations do repo e a integração passando.

## 6. Arquivos por trilha

Legenda: **C** = criar, **M** = modificar. Caminhos relativos à raiz do repositório.

### 6.0 A1: contrato (primeiro commit da trilha A, entra antes de B e C)

Pequeno e mecânico; B e C partem dele. Se o engenheiro quiser abrir as três trilhas ao mesmo tempo, B e C codificam
contra as assinaturas da seção 3 e fazem rebase quando A1 entrar (nenhum arquivo de A1 é tocado por B ou C).

| C/M | Arquivo | O quê |
| --- | --- | --- |
| M | `CLAUDE.md` | O glossário (as três linhas da seção 2 da spec: `isDemo`/`demoShop`, `DEMO_MERCHANT_PHONE`, `shop:mark-demo`; "termo novo entra na tabela antes de virar código") **e** a frase no "Padrão da API": "listagem pública usa `listedShop()` e agregado da rede usa `notDemoShop()` (`apps/api/src/shops/listed-shop.ts`): a loja demo (`shops.is_demo`) fica fora; acesso direto (QR, Carteira, Balcão, resgate, indicação) não filtra". Ajuste CTO: a frase descreve o arquivo que A1 cria, então mora em A1 e a C não toca `CLAUDE.md`. |
| M | `apps/api/src/database/schema/shops.ts` | Coluna `isDemo`. |
| C | `apps/api/drizzle/0030_shop_is_demo.sql` (+ `meta/_journal.json`, `meta/0030_snapshot.json`) | Gerados pelo `db:generate`. |
| C | `apps/api/src/shops/listed-shop.ts` | `notDemoShop()`, `listedShop()`. |
| C | `apps/api/src/shops/listed-shop.test.ts` | Renderiza os dois fragmentos com `PgDialect` e confere `"shops"."is_demo"` e `"shops"."status"`. |
| M | `apps/api/src/test-support/test-database.ts` | `createShop({ isDemo?, plan?, ownerPhoneHash? })` e `createCustomer({ phoneHash? })` (o script precisa de um dono com o hash real do número demo). |
| C | `apps/api/src/database/schema/shops.integration.test.ts` | CA-43: coluna `NOT NULL`, padrão `false`, loja criada sem o campo lê `false`. |

### 6.1 Trilha A: env, Criar o clube, script

| C/M | Arquivo |
| --- | --- |
| M | `apps/api/src/config/env.ts` |
| M | `apps/api/src/config/env.test.ts` |
| M | `apps/api/.env.example` (bloco comentado: `DEMO_MERCHANT_PHONE=` "mesmo valor de NUXT_DEMO_MERCHANT_PHONE; só dígitos, sem 55; vazio = sem loja demo; valor inválido derruba o boot") |
| M | `apps/api/src/merchant/club-setup/club-setup.rules.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.rules.test.ts` |
| C | `apps/api/src/merchant/club-setup/demo-merchant.ts` |
| C | `apps/api/src/merchant/club-setup/demo-merchant.test.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.repository.ts` |
| M | `apps/api/src/merchant/club-setup/drizzle-club-setup.repository.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.service.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.service.test.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.module.ts` |
| M | `apps/api/src/merchant/club-setup/club-setup.http.test.ts` |
| M | `apps/api/src/merchant/foundation.integration.test.ts` (construtor + CA-01/02/03/05 contra o banco) |
| M | `apps/api/src/merchant/merchant.integration.test.ts` (só o construtor novo do `ClubSetupService`) |
| M | `apps/api/src/database/shop-status.ts` (exportar `isValidActorNickname`) |
| C | `apps/api/src/database/shop-mark-demo.ts` |
| C | `apps/api/src/database/shop-mark-demo.cli.ts` |
| C | `apps/api/src/database/shop-mark-demo.integration.test.ts` |
| C | `apps/api/src/database/shop-mark-demo.cli.test.ts` |
| M | `apps/api/package.json` (script `shop:mark-demo`) |
| M | `apps/api/README.md` (linha de "Scripts de operação" e a env) |

`.env.example` e `README.md` ficam com A (e não com "docs" da C) porque descrevem exatamente o que A entrega; assim C
não toca nenhum arquivo de `apps/api` fora de `admin/` e `featured/`.

### 6.2 Trilha B: filtros nas leituras do cliente

| C/M | Arquivo |
| --- | --- |
| M | `apps/api/src/customer/discover/drizzle-discover.repository.ts` |
| M | `apps/api/src/customer/discover/discover.integration.test.ts` (CA-10, CA-11, CA-14 parte Descobrir) |
| M | `apps/api/src/customer/hits/drizzle-hits.repository.ts` |
| M | `apps/api/src/customer/hits/hits.integration.test.ts` (CA-12, CA-13) |
| M | `apps/api/src/customer/ranking/drizzle-ranking.repository.ts` |
| M | `apps/api/src/customer/ranking/ranking.integration.test.ts` (CA-19) |
| C | `apps/api/src/test-support/controller-routes.ts` (lista `METHOD caminho` de todos os handlers de um conjunto de controllers, via `PATH_METADATA`/`METHOD_METADATA`) |
| C | `apps/api/src/test-support/public-listing-routes.ts` (classificação: `PUBLIC_LISTING_ROUTES` e `DIRECT_ACCESS_ROUTES` com o motivo de cada uma) |
| C | `apps/api/src/customer/public-listing.sweep.test.ts` (unitário, sem banco) |
| C | `apps/api/src/customer/public-listing.sweep.integration.test.ts` (CA-50) |
| C | `apps/api/src/customer/demo-shop-direct-access.integration.test.ts` (CA-14 parte Carteira, CA-15 a CA-18, CA-20) |

`controller-routes.ts` repete a ideia dos helpers privados de `admin-surface.sweep.test.ts`; este não é refatorado
nesta entrega para a trilha B não tocar `src/admin` (unificar depois é um P).

### 6.3 Trilha C: admin e docs

| C/M | Arquivo |
| --- | --- |
| M | `shared/schemas/admin.ts` (`AdminShopRowSchema.isDemo`) |
| M | `apps/api/src/admin/shops/shops.repository.ts` |
| M | `apps/api/src/admin/shops/drizzle-shops.repository.ts` |
| M | `apps/api/src/admin/shops/shops.service.ts` |
| M | `apps/api/src/admin/shops/shops.service.test.ts` (fake com `isDemo`) |
| M | `apps/api/src/admin/shops/shops.http.test.ts` (fake com `isDemo`) |
| M | `apps/api/src/admin/shops/shops.integration.test.ts` (CA-30, CA-34) |
| M | `apps/api/src/featured/featured.rules.ts` |
| M | `apps/api/src/featured/featured.rules.test.ts` |
| M | `apps/api/src/admin/featured/featured.repository.ts` |
| M | `apps/api/src/admin/featured/drizzle-featured.repository.ts` |
| M | `apps/api/src/admin/featured/featured.http.test.ts` (snapshot padrão com `shopIsDemo: false`) |
| M | `apps/api/src/admin/featured/featured.integration.test.ts` (CA-31, CA-32) |
| M | `apps/api/src/admin/hits/hits.integration.test.ts` (CA-33: produto pendente da demo na fila; nenhum código de produção muda em `admin/hits`) |
| M | `docs/security/demo-login.md` (textos da seção 11 da spec; ver 9.5 abaixo) |
| M | `docs/database-model.md` (`+bool isDemo` no `Shop`; RN-07 como regra para o módulo de métricas; nota em "Índices" de que não há índice para ela) |

### 6.4 Matriz de conflito

Nenhum arquivo aparece em duas trilhas paralelas. Os únicos pontos compartilhados são **leitura**:
`shops/listed-shop.ts` e `test-support/test-database.ts` (criados/alterados só em A1; B e C só importam). `CLAUDE.md` é
só de A1 (glossário e frase do padrão; ajuste CTO). `shared/schemas/admin.ts` é só da C; nenhum código de A ou B o lê.

## 7. Ordem de dependência

```
A1 (schema + migration + listed-shop + TestDatabase + glossário)
 ├── A  (env → DemoMerchant/rules → repository/service/module → script)
 ├── B  (discover → hits → ranking → varredura → acesso direto)
 └── C  (shared admin → admin shops → featured rules/repo → docs)
        ↓
engenheiro integra (pnpm typecheck:api, pnpm test:api, pnpm test:api:db)
        ↓
qa → seguranca (club-setup, script, comparação em tempo constante, logs) → infra → code-reviewer
        ↓
implantação (spec seção 10): migration no teste → integração verde → db:migrate:prod
  → deploy da API com DEMO_MERCHANT_PHONE → shop:mark-demo --dry-run / sem dry-run (teste, depois produção)
  → conferência no app
```

Dentro de A, o script não depende do club-setup (só de A1 e do `env.ts`): pode ir em paralelo dentro da trilha.

**Ordem de deploy é obrigatória:** a API nova lê `shops.is_demo` em toda listagem pública; subir o código antes da
migration derruba Descobrir, Hits e ranking. A migration sozinha com a API antiga é inofensiva (tudo `false`).

**Ajuste CTO, o gatilho do deploy é o merge.** `apps/api/vercel.json` publica sozinho a cada push em `develop`, `main` e
`stable` (`git.deploymentEnabled`). Então "migration antes da API" quer dizer, na prática:

1. `0030` aplicada no banco de teste e `pnpm test:api:db` verde **antes** do merge no branch que publica contra ele.
2. `db:migrate:prod` (com `db:check` sem divergência) **antes** do merge/push no branch que publica a produção. O `infra`
   confere a ordem e registra no PR; o `code-reviewer` não aprova o merge sem essa linha.
3. Só depois do deploy da API com `DEMO_MERCHANT_PHONE`: `shop:mark-demo --dry-run`, conferir id e nome, e rodar sem
   `--dry-run` (teste, depois produção).

A env `DEMO_MERCHANT_PHONE` pode entrar no projeto da API antes do merge (a API antiga ignora chave desconhecida).

## 8. Estratégia de testes

Tudo no `pnpm test:api` (unitário) e `pnpm test:api:db` (integração, `describe.skipIf(!TEST_DATABASE_URL)`).

### 8.1 Unitário (sem banco)

| Arquivo | Cobre |
| --- | --- |
| `listed-shop.test.ts` | Os fragmentos referenciam `shops.is_demo` (e `status` no `listedShop`). |
| `env.test.ts` | Ausente → `undefined`; `''` → `undefined`; `5567991234567`, `(67) 99123-4567`, `6799123456` → `Invalid environment: DEMO_MERCHANT_PHONE` e a mensagem **não contém os dígitos**; válido em `production` sem ser obrigatório. |
| `club-setup.rules.test.ts` | CA-06: igual → `true`; diferente (1 byte trocado) → `false`; `null` → `false`; tamanhos diferentes → `false` sem lançar. Prova de que a comparação passa por `timingSafeEqual` com `vi.mock('node:crypto', async (original) => ({ ...(await original()), timingSafeEqual: vi.fn(<real>) }))` e conferindo a chamada (ajuste CTO: `vi.spyOn` sobre o namespace ESM de `node:crypto` não redefine o import nomeado e o teste passaria sem provar nada). Complementa a revisão humana do CA-06. |
| `demo-merchant.test.ts` | Com env vazia ninguém é dono; com env, o hash do mesmo número (pelo mesmo `PiiService`) é reconhecido e outro não; a instância não guarda o celular em claro (`JSON.stringify` e `Object.values` da instância não contêm os dígitos). |
| `club-setup.service.test.ts` | Repositório em memória recebe `marks.isDemo === true` para o celular demo e `false` para outro (CA-01/02 em unidade); env ausente → `false` (CA-03); `existing` não muda a marca (CA-05 em unidade); CA-07: `vi.spyOn` em `Logger.prototype.{log,warn,error,debug}` e `console.*` e nenhuma linha contém os dígitos do celular demo nem do JWT; a linha `Demo shop created: <shopId>` aparece só no caso demo criado; a resposta não tem `isDemo`. |
| `club-setup.http.test.ts` | CA-04: corpo com `isDemo: false` vindo do celular demo → repo recebe `true`; corpo com `is_demo: true`/`isDemo: true` de outro celular → `false`; resposta HTTP sem `isDemo`. |
| `shop-mark-demo.cli.test.ts` | CA-42 (parte pura): sem `ALLOW_SHOP_ADMIN=1`, com `CI`, sem `--actor`, `--actor` inválido, com `--shop` → erro; mensagens sem valor de env. |
| `featured.rules.test.ts` | `planPlacement` com `shopIsDemo: true` → `invalidTarget` nas duas vitrines, mesmo com vaga livre e produto aprovado. |
| `shops.service.test.ts` / `shops.http.test.ts` | `isDemo` sai na linha e no detalhe, passa no `AdminShopRowSchema`. |
| `public-listing.sweep.test.ts` | Varre **todo** `src/**/*.controller.ts` (mesma técnica do `admin-surface.sweep.test.ts`, que também varre `src` inteiro) e falha se algum `GET` fora dos caminhos `admin/*` e `merchant/*` não estiver classificado em `PUBLIC_LISTING_ROUTES` ou `DIRECT_ACCESS_ROUTES`, ou se uma rota classificada não existir mais. Ajuste CTO: varrer só `src/customer` deixava de fora qualquer leitura `@Public()` ou módulo novo fora dessa pasta (ex.: número público para a LP, RN-07), que é exatamente o esquecimento que a varredura existe para pegar. Tem um fixture (controller com `GET` não classificado) que prova que o teste falha. A integração declara os chamadores como `Record<PublicListingRoute, Caller>` (tipo derivado de `PUBLIC_LISTING_ROUTES` `as const`): rota nova na lista sem chamador não compila. |

Classificação inicial (`public-listing-routes.ts`):

- `PUBLIC_LISTING_ROUTES`: `GET discover/shops`, `GET discover/featured`, `GET discover/challenges`, `GET hits`,
  `GET hits/banners`, `GET customer/ranking`.
- `DIRECT_ACCESS_ROUTES` (com motivo): `GET wallet/cards`, `GET wallet/cards/:shopId`, `GET wallet/activity`,
  `GET wallet/rewards` (Carteira, RN-08), `GET redemptions/:id` (Resgate), `GET referrals/me` (Indicação),
  `GET customer/session`, `GET customer/profile`, `GET customer/data-export` (dado do próprio cliente),
  `GET health` (não lê loja).

Rotas `POST/PUT/DELETE` não são listagem e ficam fora da varredura. Rota `GET` nova no cliente quebra o teste até alguém
decidir, por escrito, em qual lista ela entra: é o mesmo mecanismo do `admin-surface.sweep.test.ts`.

### 8.2 Integração (Postgres de teste)

Cenário comum (helper local no arquivo da varredura, reaproveitável pelos outros de B): lojas **A** (real) e **D**
(`isDemo: true`), ambas `approved`, `founderPro`, programa ativo com boas-vindas > 0 e dia surpresa hoje, um produto do
Hits aprovado com foto em cada, destaque pago vigente em `discoverCarousel` e em `hitsBanner` (com `hitItemId`) para as
duas. Como o banco de teste é compartilhado, as conferências são por **ausência de `D.id`** e **presença de `A.id`**, e as
chamadas ao repositório usam limite alto (padrão já usado em `discover.integration.test.ts`) para não depender de outras
lojas.

| Arquivo | CA |
| --- | --- |
| `schema/shops.integration.test.ts` | CA-43 |
| `merchant/foundation.integration.test.ts` | CA-01 (celular demo → `is_demo = true` no banco), CA-02, CA-03 (sem env → `false`), CA-05 (dono demo com loja `false` chama de novo → resposta `existing` e continua `false`), concorrência: duas abas do dono demo → uma loja, marcada. |
| `database/shop-mark-demo.integration.test.ts` | CA-40 (dry-run não grava e devolve id/nome), CA-41 (marca; segunda vez `alreadyMarked`), CA-42 (parte banco: hash sem usuário → `userNotFound`; usuário sem loja → `shopNotFound`; nada gravado). Saída capturada não contém o celular. |
| `customer/discover/discover.integration.test.ts` | CA-10, CA-11 (D fora do grupo pago e do Pro), CA-14 (cliente com cartão em D não vê D na lista) |
| `customer/hits/hits.integration.test.ts` | CA-12 (com e sem `group`, primeira página e a seguinte pelo cursor, com página pequena via `CUSTOMER_HITS_PAGE_SIZE`), CA-13 |
| `customer/ranking/ranking.integration.test.ts` | CA-19 (X 3 em A; Y 5 em D + 1 em A → X à frente, `me.visits` de Y = 1, e `topAndMe`/`visitsOf` iguais para Y) |
| `customer/public-listing.sweep.integration.test.ts` | **CA-50**: um `caller` por rota de `PUBLIC_LISTING_ROUTES`, chamando o **service** real com repositórios Drizzle (como os testes de integração atuais). Para cada resposta: `JSON.stringify` não contém `D.id`; nas que listam lojas/produtos, contém `A.id` (prova de que o cenário vale); nenhuma resposta tem a chave `isDemo`. Ranking: Y só com visitas em D não aparece no top e tem `me.visits = 0`. |
| `customer/demo-shop-direct-access.integration.test.ts` | CA-14 (Carteira mostra o cartão de D), CA-15 (`shop-join` em D), CA-16 (`check-in` por token e por código em D, com a antifraude), CA-17 (resgate em D gerado pelo cliente e confirmado pelo Balcão de D), CA-18 (indicação para D liquidada na primeira visita), CA-20 (D `suspended` recusa 15 a 17 como qualquer suspensa). Usa `test-support/claim-visit.ts` e os services reais, como os testes de integração existentes de cada módulo. |
| `admin/shops/shops.integration.test.ts` | CA-30 (D aparece com e sem filtro de situação/nome; aprovar, suspender, reativar), CA-34 (`isDemo` true/false) |
| `admin/featured/featured.integration.test.ts` | CA-31 (`proShops` sem D), CA-32 (`create` para D em `discoverCarousel` e `hitsBanner` → `invalidTarget`; contagem de `featured_placements` de D não muda) |
| `admin/hits/hits.integration.test.ts` | CA-33 |

Por que a varredura chama services e não HTTP: não há precedente de app Nest inteiro contra o banco de teste no repo, e o
filtro mora no repository; a parte "toda rota está classificada" já é coberta pelo teste unitário sobre os controllers.

## 9. Decisão 9.5 (pendente do dono)

O código não lê `shops.status` de forma diferente para a demo, então as duas respostas funcionam sem mudança:

- **(a) mantém "aprova antes, suspende depois":** `demo-login.md` só troca o motivo (deixa de ser "aparecer no
  Descobrir" e passa a ser "ninguém de fora entrar no clube pelo QR fotografado").
- **(b) pode ficar aprovada sempre:** `demo-login.md` troca a regra pela de limpeza de clientes reais.

A trilha C escreve `demo-login.md` com a regra **atual (a)** e o motivo novo, e deixa a frase da (b) pronta na descrição
do PR. Se o dono escolher (b), é a troca de um parágrafo, sem código.

## 10. Riscos

| Risco | Efeito | Mitigação |
| --- | --- | --- |
| Deploy da API antes da migration | Descobrir, Hits e ranking caem (coluna inexistente). | Ordem da seção 7. O deploy é automático no push (`vercel.json`), então a migration entra **antes do merge**; `infra` confere `db:check` e registra no PR. |
| Leitura pública nova que esquece o filtro | Demo volta a aparecer. | Filtro único `listedShop()` + `public-listing.sweep.test.ts` (rota `GET` nova sem classificação quebra) + CA-50. Frase no `CLAUDE.md`. A varredura cobre todo `GET` de `src` fora de `admin/*` e `merchant/*` (ajuste CTO). Limite que sobra: leitura pública que não seja `GET` de controller (ex.: job que gera arquivo estático) não é vista. |
| Agregado da rede novo (métricas, vagas de Fundador) que esquece `notDemoShop()` | Demo conta em número da rede. | RN-07 no `CLAUDE.md` e no `database-model.md`. Não há agregado hoje; o primeiro módulo de métricas leva o seu teste. |
| `DEMO_MERCHANT_PHONE` diferente de `NUXT_DEMO_MERCHANT_PHONE` | Loja demo nasce pública. | Passo de ativação em `demo-login.md` exige as duas iguais; `shop:mark-demo` corrige. A API não consegue conferir a env do web (projetos separados). |
| Env apontando para celular real | Só a loja **criada depois** por aquele celular nasce escondida. | Spec 8.4 (risco aceito); revisão da env; o boot nunca marca nem desmarca loja existente. |
| Número demo trocado **antes** de rodar o backfill | A loja antiga (sem marca) fica inalcançável pelo script, que não aceita `--shop`. | `demo-login.md`: rodar `shop:mark-demo` antes de qualquer rodízio. Sem isso, o caminho é suspender a loja antiga. |
| Celular demo em claro dentro do objeto `ENV` | O valor existe na memória do processo, como `PII_HASH_PEPPER` e os outros segredos. | `DemoMerchant` declara só `Pick<Env, 'DEMO_MERCHANT_PHONE'>`, não guarda o `env` e guarda só o hash; `parseEnv` não imprime valor; nada loga `ENV`. Número de teste, não de pessoa. |
| Comparação que vaza por tempo | Teórico (o atacante não escolhe o hash do JWT sem confirmar o SMS). | `timingSafeEqual` sobre HMAC, por regra (RN-02) e teste; revisão do `seguranca`/`code-reviewer`. |
| Rotação do `PII_HASH_PEPPER` | O hash do número demo muda junto com todos os `phone_hash`. | Não é novo: o `DemoMerchant` recalcula no boot com o pepper vigente, então segue casando com o `phone_hash` reescrito. |
| Ranking mais lento | Join a mais por linha do ledger do mês. | Join por PK com tabela pequena; se o `qa` quiser, `scansWithoutSeqScan` no teste do ranking prova que `shops_pkey` atende. |
| Destaque pago da demo criado antes do backfill | Ocupa vaga no admin sem aparecer. | Comportamento definido pela RN-10 (igual à loja suspensa); o admin cancela se quiser. |
| Cliente real com cartão na demo | Continua usando (RN-08). | Fora do escopo por decisão; regra de limpeza em `demo-login.md`. |

## 11. Fora do escopo (confirma a spec)

Conta de cliente demo, aviso ao lojista demo, desmarcar loja, filtro nos fluxos de acesso direto, tela de admin,
auditoria em tabela do script, refatorar `admin-surface.sweep.test.ts` ou `shop-status.cli.ts` além de exportar
`isValidActorNickname`, schema estrito no `ClubSetupDraftSchema`.
