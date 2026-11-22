import { expect, it } from 'vitest'
import { expirationStatus, isLowStock, quantityAfter, suggestedItems } from '../src/inventory'
import type { Pantry } from '../src/data'

const product: Pantry = { id: 'p', name: 'Oat milk', quantity: 0.1, threshold: 1, unit: 'cartons' }
const today = '2026-12-28'

it('keeps quantities nonnegative and avoids fractional drift', () => {
  expect(quantityAfter(product, -1)).toBe(0)
  expect(quantityAfter({ ...product, quantity: quantityAfter(product, 1) }, -1)).toBe(0.1)
  expect(quantityAfter({ ...product, quantity: 1.23e-7 }, 1)).toBe(1.000000123)
  expect(isLowStock({ ...product, quantity: 1 })).toBe(true)
  expect(isLowStock({ ...product, quantity: 1.01 })).toBe(false)
})

it('flags expired, expiring today, and seven-day expirations across months', () => {
  expect(expirationStatus({ ...product, expires: '2026-12-27' }, today)).toBe('Expired')
  expect(expirationStatus({ ...product, expires: today }, today)).toBe('Expires today')
  expect(expirationStatus({ ...product, expires: '2027-01-04' }, today)).toBe('Expires this week')
  expect(expirationStatus({ ...product, expires: '2027-01-05' }, today)).toBeUndefined()
})

it('suggests only low stock products missing from open shopping lists', () => {
  const beans = { ...product, id: 'beans', name: 'Coffee beans', quantity: 0 }
  const duplicates = { ...beans, id: 'copy', name: 'COFFEE BEANS ' }
  const stock = [product, beans, duplicates, { ...product, id: 'tea', name: 'Tea', quantity: 3 }]
  const list = [
    { id: 'a', name: ' oat milk ', done: false, listId: 'first' },
    { id: 'b', name: 'Coffee beans', done: true, listId: 'second' },
  ]
  expect(suggestedItems(stock, list)).toEqual([beans])
})
