const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const integer = new Intl.NumberFormat('pt-BR')

export function formatCurrency(cents: number): string {
  return brl.format(cents / 100)
}

export function formatInteger(value: number): string {
  return integer.format(value)
}
