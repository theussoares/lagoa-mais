import { describe, expect, it } from 'vitest'
import { describeMarkDemoOutcome, parseMarkDemoInvocation } from './shop-mark-demo.cli'

// CA-42 (parte pura). Número de teste inventado: aparece só para provar que nenhuma mensagem o repete.
const DEMO_PHONE = '67911110000'
const allowed: NodeJS.ProcessEnv = { ALLOW_SHOP_ADMIN: '1', DEMO_MERCHANT_PHONE: DEMO_PHONE }

describe('parseMarkDemoInvocation', () => {
  it('accepts an operator nickname, with and without --dry-run', () => {
    expect(parseMarkDemoInvocation(['--actor', 'po'], allowed)).toEqual({ ok: true, value: { actor: 'po', dryRun: false } })
    expect(parseMarkDemoInvocation(['--dry-run', '--actor', 'po'], allowed)).toEqual({ ok: true, value: { actor: 'po', dryRun: true } })
  })

  it.each([
    ['without ALLOW_SHOP_ADMIN=1', ['--actor', 'po'], { DEMO_MERCHANT_PHONE: DEMO_PHONE }],
    ['in CI', ['--actor', 'po'], { ...allowed, CI: 'true' }],
    ['without --actor', ['--dry-run'], allowed],
    ['with an --actor value missing', ['--actor'], allowed],
    ['with the nickname forgotten before --dry-run', ['--actor', '--dry-run'], allowed],
    ['with a flag-like nickname', ['--actor', '-x'], allowed],
    ['with an e-mail as actor', ['--actor', 'po@lagoamais.com.br'], allowed],
    ['with --shop', ['--actor', 'po', '--shop', '018f98a2-7b2a-7182-9f33-6d004bbbb111'], allowed],
    ['with --shop=<id>', ['--actor', 'po', '--shop=018f98a2-7b2a-7182-9f33-6d004bbbb111'], allowed],
    ['with an unknown argument (maybe a pasted phone)', ['--actor', 'po', DEMO_PHONE], allowed],
  ])('refuses to run %s, without echoing env values', (_case, argv, env) => {
    const result = parseMarkDemoInvocation(argv, env)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).not.toContain(DEMO_PHONE)
    expect(result.error).not.toContain('@')
  })
})

describe('describeMarkDemoOutcome', () => {
  const target = { shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb111', shopName: 'Loja Demonstração' }

  it('prints one line with id and name only', () => {
    expect(describeMarkDemoOutcome({ kind: 'wouldMark', ...target }, 'po')).toEqual({ ok: true, value: `Dry run: would mark shop ${target.shopId} "Loja Demonstração" as demo` })
    expect(describeMarkDemoOutcome({ kind: 'marked', ...target }, 'po')).toEqual({ ok: true, value: `Shop ${target.shopId} "Loja Demonstração": marked as demo (actor po)` })
    expect(describeMarkDemoOutcome({ kind: 'alreadyMarked', ...target }, 'po')).toEqual({ ok: true, value: `Shop ${target.shopId} "Loja Demonstração": already marked, nothing changed` })
  })

  it('turns a missing user or shop into an error', () => {
    expect(describeMarkDemoOutcome({ kind: 'userNotFound' }, 'po')).toEqual({ ok: false, error: 'Not changed: userNotFound' })
    expect(describeMarkDemoOutcome({ kind: 'shopNotFound' }, 'po')).toEqual({ ok: false, error: 'Not changed: shopNotFound' })
  })
})
