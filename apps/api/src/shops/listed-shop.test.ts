import { PgDialect } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { listedShop, notDemoShop } from './listed-shop'

// O fragmento é o único lugar que conhece a coluna: se ele parar de citá-la, toda vitrine volta a mostrar a demo.
const dialect = new PgDialect()
const render = (fragment: ReturnType<typeof listedShop>) => dialect.sqlToQuery(fragment)

describe('notDemoShop', () => {
  it('keeps only shops whose demo mark is off', () => {
    const query = render(notDemoShop())
    expect(query.sql).toBe('"shops"."is_demo" = $1')
    expect(query.params).toEqual([false])
  })
})

describe('listedShop', () => {
  it('requires an approved, non-demo shop', () => {
    const query = render(listedShop())
    expect(query.sql).toBe('("shops"."status" = $1 and "shops"."is_demo" = $2)')
    expect(query.params).toEqual(['approved', false])
  })

  it('builds a fresh fragment on every call', () => {
    expect(listedShop()).not.toBe(listedShop())
    expect(notDemoShop()).not.toBe(notDemoShop())
  })
})
