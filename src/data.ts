export type Schedule = { id: string; name: string; date: string; interval: number; notes: string; lastDone: string }
export type Pantry = { id: string; name: string; quantity: number; threshold: number; unit: string }
export type ShoppingList = { id: string; name: string }
export type Grocery = { id: string; name: string; listId: string; done: boolean }
export type Event = { id: string; name: string; date: string; time: string; notes: string }
export type State = {
  version: 1
  chores: Schedule[]
  pantry: Pantry[]
  lists: ShoppingList[]
  groceries: Grocery[]
  medication: Schedule[]
  vet: Schedule[]
  calendar: Event[]
  maintenance: Schedule[]
}
export type Collection = Exclude<keyof State, 'version'>
export type RecordItem = State[Collection][number]
export const storageKey = 'homebase-v1'

export function dayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function offsetDay(date: string, days: number) {
  const value = new Date(date + 'T12:00:00')
  value.setDate(value.getDate() + days)
  return dayKey(value)
}

export function formatDay(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, options)
}

export function seed(): State {
  const today = dayKey()
  const schedule = (id: string, name: string, days: number, interval: number, notes = '') =>
    ({ id, name, date: offsetDay(today, days), interval, notes, lastDone: '' })
  return {
    version: 1,
    chores: [
      schedule('c1', 'Laundry', 0, 7, 'Wash and fold'),
      schedule('c2', 'Change bedsheets', 2, 14, 'Bedroom'),
      schedule('c3', 'Vacuuming', 1, 7, 'Living room and hallway'),
      schedule('c4', 'Dishes', 0, 1, 'Run the dishwasher'),
      schedule('c5', 'Clean coffee machine', 5, 30, 'Follow the machine manual'),
    ],
    pantry: [
      { id: 'p1', name: 'Oat milk', quantity: 1, threshold: 1, unit: 'cartons' },
      { id: 'p2', name: 'Coffee beans', quantity: 0, threshold: 1, unit: 'bags' },
      { id: 'p3', name: 'Pasta', quantity: 4, threshold: 1, unit: 'boxes' },
      { id: 'p4', name: 'Olive oil', quantity: 2, threshold: 1, unit: 'bottles' },
    ],
    lists: [{ id: 'l1', name: 'Weekly groceries' }, { id: 'l2', name: 'Household supplies' }],
    groceries: [
      { id: 'g1', name: 'Bananas', listId: 'l1', done: false },
      { id: 'g2', name: 'Greek yogurt', listId: 'l1', done: false },
      { id: 'g3', name: 'Paper towels', listId: 'l2', done: false },
    ],
    medication: [schedule('m1', 'Sample medication for Milo', 3, 30, 'Demo only. Record your veterinarian’s instructions here.')],
    vet: [schedule('v1', 'Milo’s wellness visit', 8, 0, 'Sample appointment')],
    calendar: [{ id: 'e1', name: 'Meal planning', date: offsetDay(today, 4), time: '17:30', notes: 'Plan meals for the week' }],
    maintenance: [
      schedule('a1', 'Replace HVAC filter', 12, 90, 'Check filter size before shopping'),
      schedule('a2', 'Clean dishwasher filter', 6, 30, 'See the appliance manual'),
    ],
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isName = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
const isQuantity = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0
const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value + 'T12:00:00')
  return !Number.isNaN(parsed.getTime()) && dayKey(parsed) === value
}

export function parseBackup(text: string): State {
  const data: unknown = JSON.parse(text)
  if (!isObject(data) || data.version !== 1) throw new Error('Choose a HomeBase V1 JSON backup.')
  const schedule = (item: Record<string, unknown>) => isDate(item.date) &&
    isQuantity(item.interval) && Number.isInteger(item.interval) && item.interval <= 36500 &&
    typeof item.notes === 'string' && (item.lastDone === '' || isDate(item.lastDone))
  const validators: Record<Collection, (item: Record<string, unknown>) => boolean> = {
    chores: schedule, medication: schedule, vet: schedule, maintenance: schedule,
    pantry: item => isQuantity(item.quantity) && isQuantity(item.threshold) && typeof item.unit === 'string',
    lists: () => true,
    groceries: item => isName(item.listId) && typeof item.done === 'boolean',
    calendar: item => isDate(item.date) && typeof item.time === 'string' &&
      (item.time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) && typeof item.notes === 'string',
  }
  const collections = Object.keys(validators) as Collection[]
  for (const key of collections) {
    const rows = data[key]
    const ids = new Set<string>()
    if (!Array.isArray(rows) || !rows.every(item => {
      if (!isObject(item) || !isName(item.id) || !isName(item.name) || ids.has(item.id) || !validators[key](item)) return false
      ids.add(item.id)
      return true
    })) throw new Error('The backup has invalid or duplicate records.')
  }
  const validated = data as unknown as State
  if (validated.groceries.some(item => !validated.lists.some(list => list.id === item.listId))) {
    throw new Error('The backup contains shopping items with missing lists.')
  }
  return validated
}

export function finishTask(task: Schedule, today = dayKey()): Schedule {
  const base = task.date > today ? task.date : today
  return { ...task, lastDone: today, date: task.interval ? offsetDay(base, task.interval) : task.date }
}

export const activeTask = (task: Schedule) => !!task.interval || !task.lastDone
