import { expect, it } from 'vitest'
import { weekPlan, orderDue, type TaskEntry } from '../src/weekly-plan'
import { defaultPlanner } from '../src/smart-plan'
import type { Schedule } from '../src/data'
import type { Priority } from '../src/chore-library'

const today = '2026-11-23'
const task = (id: string, date: string, changes?: Partial<Schedule>): Schedule =>
  ({ id, name: id, date, notes: '', lastDone: '', interval: 0, rule: { mode: 'weekly' },
    plan: { priority: 'normal', flexible: true, minutes: 12 }, ...changes })

it('keeps explicitly fixed chores, medication and safety tasks due even over budget on rest days', () => {
  const smoke = task('smoke', today, { plan: { priority: 'critical', flexible: true, minutes: 5 } })
  const medicine = task('medicine', today, { rule: { mode: 'daily' } })
  const flexible = task('flexible', today)
  const entries: TaskEntry[] = [{ collection: 'chores', task: smoke }, { collection: 'medication', task: medicine }, { collection: 'chores', task: flexible }]
  const { days } = weekPlan(entries, today, { ...defaultPlanner(), budget: 10, restDays: [1] })
  expect(days[0].tasks.map(row => row.task.id)).toEqual(['smoke', 'medicine'])
  expect(days[0].minutes).toBe(17)
  const placed = days.find(day => day.tasks.some(row => row.task.id === 'flexible'))
  expect(placed?.date).not.toBe(today)
  expect(placed?.date).toBeDefined()
  expect(entries.map(row => row.task.date)).toEqual([today, today, today])
  expect(days.flatMap(day => day.tasks.filter(row => row.task.id === 'medicine'))).toHaveLength(7)
})

it('keeps selected frequencies, snoozes, and future forecast occurrences distinct', () => {
  const unusual = task('interval', today, { rule: { mode: 'interval', days: 2 } })
  const snoozed = task('snoozed', today, { snoozedUntil: '2026-11-25' })
  const manual = task('manual', today, { plan: { cadence: 'afterUse', priority: 'critical', flexible: false, minutes: 5 } })
  const plan = weekPlan([unusual, snoozed, manual].map(task => ({ collection: 'chores', task })), today, defaultPlanner())
  const rows = plan.days.flatMap(day => day.tasks)
  expect(rows.filter(row => row.task.id === 'interval').map(row => row.due)).toEqual(['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-29'])
  expect(rows.find(row => row.task.id === 'snoozed')).toMatchObject({ day: '2026-11-25', fixed: true })
  expect(rows.some(row => row.task.id === 'manual')).toBe(false)
})

it('prioritizes overdue work and prefers a lower-overflow day when possible', () => {
  const entry = (id: string, date: string, priority: Priority): TaskEntry => ({
    collection: 'chores', task: task(id, date, { plan: { priority, flexible: true, minutes: 10 } }),
  })
  const overdue = entry('overdue', '2026-11-20', 'normal')
  const current = entry('current', today, 'high')
  expect(orderDue(overdue, current, today)).toBeLessThan(0)
  const { days } = weekPlan([current, overdue], today, { ...defaultPlanner(), budget: 10 })
  expect(days[0].tasks[0].task.id).toBe('overdue')
  expect(days[1].tasks[0].task.id).toBe('current')
})
