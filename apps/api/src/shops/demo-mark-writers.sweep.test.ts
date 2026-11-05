import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// RN-04: a marca de demonstração só liga, e por dois caminhos (Criar o clube no INSERT e `shop:mark-demo`). A ameaça é
// o próximo `update(shops).set({ ...form })` ou um `sql` cru que escreva `is_demo`/`demo_marked_*`: desligaria a marca
// (a demo voltaria à vitrine) ou apagaria a trilha de quem marcou. Varredura textual, barata e imperfeita (um spread de
// objeto montado longe daqui passa), mas pega o caso comum de alguém escrever o campo pelo nome.

const SRC = join(__dirname, '..')
const ALLOWED_WRITERS = ['database/shop-mark-demo.ts', 'merchant/club-setup/drizzle-club-setup.repository.ts']
const MARK_FIELD = /\b(isDemo|demoMarkedAt|demoMarkedBy)\s*:/
const MARK_COLUMN = /\b(is_demo|demo_marked_at|demo_marked_by)\b/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'test-support' ? [] : sourceFiles(path)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

/** O argumento de cada `.set(`/`.values(` (parênteses balanceados), onde o Drizzle recebe o que vai gravar. */
function writeArguments(code: string): string[] {
  const found: string[] = []
  for (const match of code.matchAll(/\.(set|values)\(/g)) {
    const start = match.index + match[0].length
    let depth = 1
    let end = start
    while (end < code.length && depth > 0) {
      if (code[end] === '(') depth++
      if (code[end] === ')') depth--
      end++
    }
    found.push(code.slice(start, end - 1))
  }
  return found
}

/** Conteúdo de cada template `sql\`...\`` (SQL cru). */
const rawSql = (code: string): string[] => [...code.matchAll(/sql`([^`]*)`/g)].map((match) => match[1] ?? '')

const files = sourceFiles(SRC).map((path) => ({ path: relative(SRC, path), code: readFileSync(path, 'utf8') }))

describe('demo mark writers sweep', () => {
  it('finds the source tree and the two allowed writers', () => {
    expect(files.length).toBeGreaterThan(100)
    for (const allowed of ALLOWED_WRITERS) {
      const file = files.find((candidate) => candidate.path === allowed)
      expect(file && writeArguments(file.code).some((argument) => MARK_FIELD.test(argument)), allowed).toBe(true)
    }
  })

  it('writes the demo mark or its trail only in the club setup insert and in shop:mark-demo', () => {
    const offenders = files
      .filter((file) => !ALLOWED_WRITERS.includes(file.path) && file.path !== 'database/schema/shops.ts')
      .filter((file) => writeArguments(file.code).some((argument) => MARK_FIELD.test(argument)) || rawSql(file.code).some((query) => MARK_COLUMN.test(query)))
      .map((file) => file.path)
    expect(offenders).toEqual([])
  })

  it('never turns the mark off', () => {
    const offenders = files.filter((file) => writeArguments(file.code).some((argument) => /\bisDemo\s*:\s*false\b/.test(argument))).map((file) => file.path)
    expect(offenders).toEqual([])
  })
})
