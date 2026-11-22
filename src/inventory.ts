import { offsetDay, type Grocery, type Pantry } from './data'

export const isLowStock = (item: Pantry) => item.quantity <= item.threshold

export function quantityAfter(item: Pantry, change: -1 | 1) {
  const result = item.quantity + change
  if (!Number.isFinite(result)) return item.quantity
  if (result <= 0 || Number.isInteger(item.quantity)) return Math.max(0, result)
  const [mantissa, exponent = '0'] = String(item.quantity).split('e')
  const decimals = Math.max(0, (mantissa.split('.')[1]?.length ?? 0) - Number(exponent))
  return Number(result.toFixed(Math.min(decimals, 100)))
}

export function expirationStatus(item: Pantry, today: string) {
  if (!item.expires) return undefined
  if (item.expires < today) return 'Expired'
  if (item.expires === today) return 'Expires today'
  if (item.expires <= offsetDay(today, 7)) return 'Expires this week'
  return undefined
}

const normalized = (name: string) => name.trim().toLocaleLowerCase()

export function suggestedItems(pantry: Pantry[], groceries: Grocery[]) {
  const alreadyListed = new Set(groceries.filter(item => !item.done).map(item => normalized(item.name)))
  return pantry.filter(item => {
    const name = normalized(item.name)
    if (!isLowStock(item) || alreadyListed.has(name)) return false
    alreadyListed.add(name)
    return true
  })
}
