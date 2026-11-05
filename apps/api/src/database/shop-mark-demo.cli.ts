import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { err, ok, type Result } from '#shared/types/result'
import { PiiService } from '../common/pii.service'
import { parseEnv, type Env } from '../config/env'
import * as schema from './schema'
import { markDemoShop, type MarkDemoShopOutcome } from './shop-mark-demo'
import { CLUB_SETUP_DEMO_MARKER } from '../shops/demo-mark'
import { isValidActorNickname } from './shop-status'

export interface MarkDemoInvocation {
  readonly actor: string
  readonly dryRun: boolean
}

const USAGE = 'Usage: ALLOW_SHOP_ADMIN=1 pnpm shop:mark-demo --actor <nickname> [--dry-run]'

/**
 * Travas de operação, puras (as mesmas do `shop:status`): `ALLOW_SHOP_ADMIN=1`, fora de CI, `--actor` válido. `--shop`
 * é recusado: o alvo vem do `DEMO_MERCHANT_PHONE`. Nenhuma mensagem repete valor de env nem argumento desconhecido (o
 * operador pode ter colado o celular ali).
 */
export function parseMarkDemoInvocation(argv: readonly string[], env: NodeJS.ProcessEnv): Result<MarkDemoInvocation, string> {
  if (env.ALLOW_SHOP_ADMIN !== '1') return err('Refusing to run: set ALLOW_SHOP_ADMIN=1')
  if (env.CI) return err('Refusing to run in CI')
  let actor: string | undefined
  let dryRun = false
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--actor') {
      // `--actor --dry-run` (apelido esquecido) não pode engolir o `--dry-run`: o apelido passaria no padrão e o
      // script gravaria quando o operador pediu só a prévia.
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('-')) return err(USAGE)
      actor = value
      index++
    } else if (arg === '--shop' || arg?.startsWith('--shop=')) {
      return err('--shop is not accepted: the target comes from DEMO_MERCHANT_PHONE')
    } else {
      return err(`Unknown argument at position ${index + 1}. ${USAGE}`)
    }
  }
  if (actor === undefined) return err(USAGE)
  if (!isValidActorNickname(actor)) return err('--actor must be a short operator nickname (a-z, 0-9, . _ -), never an e-mail')
  if (actor === CLUB_SETUP_DEMO_MARKER) return err(`--actor ${CLUB_SETUP_DEMO_MARKER} is reserved for shops marked by the club setup`)
  return ok({ actor, dryRun })
}

/** Uma linha para o terminal: id e nome da loja, nunca o celular nem o hash. */
export function describeMarkDemoOutcome(outcome: MarkDemoShopOutcome, actor: string): Result<string, string> {
  switch (outcome.kind) {
    case 'wouldMark':
      return ok(`Dry run: would mark shop ${outcome.shopId} "${outcome.shopName}" as demo`)
    case 'marked':
      return ok(`Shop ${outcome.shopId} "${outcome.shopName}": marked as demo (actor ${actor})`)
    case 'alreadyMarked':
      return ok(`Shop ${outcome.shopId} "${outcome.shopName}": already marked, nothing changed`)
    case 'userNotFound':
    case 'shopNotFound':
      return err(`Not changed: ${outcome.kind}`)
  }
}

/**
 * Linha de erro para o que não é recusa nossa (driver, rede, bug). Fixa de propósito: a mensagem do `postgres` pode
 * trazer host, usuário ou o valor que falhou, e o terminal do operador costuma ir parar em print e chat.
 */
export const UNEXPECTED_FAILURE_LINE = 'shop:mark-demo failed'

/** `ALLOW_SHOP_ADMIN=1 pnpm shop:mark-demo --actor <apelido> [--dry-run]`. Trilha em `shops.demo_marked_{at,by}` (decisão 9.6 b). */
async function main(): Promise<Result<string, string>> {
  const invocation = parseMarkDemoInvocation(process.argv.slice(2), process.env)
  if (!invocation.ok) return invocation
  let env: Env
  try {
    env = parseEnv(process.env)
  } catch (error) {
    // `parseEnv` só lança a própria mensagem, que lista nomes de env e nunca valores.
    return err(error instanceof Error ? error.message : 'Invalid environment')
  }
  if (env.DEMO_MERCHANT_PHONE === undefined) return err('Refusing to run: DEMO_MERCHANT_PHONE is not set')
  const demoPhoneHash = new PiiService(env).hashPhone(env.DEMO_MERCHANT_PHONE)

  const client = postgres(env.DATABASE_URL, { prepare: false })
  try {
    const outcome = await markDemoShop(drizzle(client, { schema }), demoPhoneHash, { dryRun: invocation.value.dryRun, actor: invocation.value.actor })
    return describeMarkDemoOutcome(outcome, invocation.value.actor)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().then(
    (result) => {
      if (result.ok) {
        console.log(result.value)
        return
      }
      // Recusas nossas: texto escrito aqui, sem valor de env nem argumento.
      console.error(result.error)
      process.exitCode = 1
    },
    () => {
      console.error(UNEXPECTED_FAILURE_LINE)
      process.exitCode = 1
    },
  )
}
