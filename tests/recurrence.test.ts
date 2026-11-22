import { describe, expect, it } from 'vitest'
import { applyTaskAction, canUndo, dueDate, isActive, undoTask, type Rule } from '../src/recurrence'
import type { Schedule } from '../src/data'

function schedule(date: string, rule?: Rule, interval = 0): Schedule {
  return { id: 'task', name: 'Clean', date, interval, notes: '', lastDone: '', rule }
}

describe('recurring schedules', () => {
  it.each([
    [{ mode: 'daily' }, '2026-01-01', '2026-01-10', '2026-01-11'],
    [{ mode: 'weekly' }, '2026-01-01', '2026-01-10', '2026-01-15'],
    [{ mode: 'interval', days: 3 }, '2026-01-01', '2026-01-11', '2026-01-13'],
    [{ mode: 'completion', days: 3 }, '2026-01-09', '2026-01-04', '2026-01-07'],
    [{ mode: 'weekdays', weekdays: [1, 4] }, '2026-01-01', '2026-01-03', '2026-01-05'],
    [{ mode: 'weekdays', weekdays: [0] }, '2026-01-04', '2026-01-04', '2026-01-11'],
  ] as [Rule, string, string, string][])('applies %j from %s on %s', (rule, date, today, next) => {
    const task = applyTaskAction(schedule(date, rule), 'complete', today)
    expect(task.date).toBe(next)
    expect(task.lastDone).toBe(today)
    expect(task.history).toHaveLength(1)
    expect(applyTaskAction(task, 'complete', today)).toBe(task)
  })

  it('keeps a month-end anchor through leap February', () => {
    const february = applyTaskAction(schedule('2028-01-31', { mode: 'monthly', monthDay: 31 }), 'complete', '2028-01-31')
    expect(february.date).toBe('2028-02-29')
    const march = applyTaskAction(february, 'complete', '2028-02-29')
    expect(march.date).toBe('2028-03-31')
    expect(march.history).toHaveLength(2)
  })

  it('places the next monthly occurrence in a new month if the first due date uses a different day', () => {
    expect(applyTaskAction(schedule('2026-01-15', { mode: 'monthly', monthDay: 31 }), 'complete', '2026-01-15').date).toBe('2026-02-28')
  })

  it('keeps the legacy interval policy for existing records', () => {
    expect(applyTaskAction(schedule('2026-01-09', undefined, 3), 'complete', '2026-01-04').date).toBe('2026-01-12')
  })

  it('snoozes without shifting the schedule, then skips and undoes one occurrence at a time', () => {
    const start = schedule('2026-01-01', { mode: 'weekly' })
    const snoozed = applyTaskAction(start, 'snooze', '2026-01-01', '2026-01-05')
    expect(snoozed.date).toBe(start.date)
    expect(dueDate(snoozed)).toBe('2026-01-05')
    expect(applyTaskAction(snoozed, 'snooze', '2026-01-01', '2026-01-04')).toBe(snoozed)
    const skipped = applyTaskAction(snoozed, 'skip', '2026-01-05')
    expect(skipped.date).toBe('2026-01-08')
    expect(skipped.lastDone).toBe('')
    expect(dueDate(undoTask(skipped))).toBe('2026-01-05')
    const undone = undoTask(undoTask(skipped))
    expect(dueDate(undone)).toBe(start.date)
    expect(undone.history?.every(entry => entry.undone)).toBe(true)
    expect(canUndo(undone)).toBe(false)
  })

  it('closes a skipped one-time task and prevents completion from duplicating history', () => {
    const start = schedule('2026-01-01')
    const skipped = applyTaskAction(start, 'skip', '2026-01-01')
    expect(isActive(skipped)).toBe(false)
    expect(applyTaskAction(skipped, 'complete', '2026-01-01')).toBe(skipped)
    expect(isActive(undoTask(skipped))).toBe(true)
    expect(canUndo({ ...skipped, date: '2026-01-02' })).toBe(false)
  })
})
