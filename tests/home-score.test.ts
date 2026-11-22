import { expect, it } from 'vitest'
import { completionDays, homeProgress, weeklyScore } from '../src/home-score'
import { applyTaskAction, undoTask } from '../src/recurrence'
import { defaultPlanner } from '../src/smart-plan'
import type { Schedule } from '../src/data'

const chore = (id: string, day: string): Schedule =>
  ({ id, name: id, date: day, lastDone: '', notes: '', interval: 0, rule: { mode: 'daily' } })

it('counts personal active days and one XP award per chore per day', () => {
  const monday = '2026-11-23'
  const tuesday = '2026-11-24'
  const jan = applyTaskAction(chore('a', monday), 'complete', monday)
  const again = applyTaskAction(jan, 'complete', tuesday)
  const other = applyTaskAction(chore('b', monday), 'complete', monday)
  const result = homeProgress([again, other], tuesday, 3, defaultPlanner())
  expect(result.current).toMatchObject({ score: 67, active: 2, completions: 3, target: 3 })
  expect(result.xp).toBe(30)
  expect(result.level).toBe(1)
  expect(result.badges).toContain('First finish')
  expect(homeProgress([undoTask(again), other], tuesday, 3, defaultPlanner()).xp).toBe(20)
  const manual = { ...chore('manual', monday), plan: { cadence: 'afterUse', priority: 'normal', flexible: false, minutes: 5 } } as const
  const twice = applyTaskAction(applyTaskAction(manual, 'complete', monday), 'complete', monday)
  expect(completionDays([twice], tuesday).get(monday)).toBe(1)
})

it('reduces the target for unavailable days and marks a fully paused week', () => {
  const monday = '2026-11-23'
  const sunday = '2026-11-29'
  const days = new Map([[monday, 1]])
  expect(weeklyScore(monday, sunday, 7, { ...defaultPlanner(), restDays: [0, 6] }, days)).toMatchObject({ score: 20, target: 5 })
  expect(weeklyScore(monday, sunday, 5, { ...defaultPlanner(), breaks: [{ start: monday, end: sunday }] }, days)).toMatchObject({ score: null, target: 0 })
})

it('keeps streaks through break weeks and an unfinished current week', () => {
  const previous = ['2026-11-09', '2026-11-10', '2026-11-11'].map((day, i) => applyTaskAction(chore(String(i), day), 'complete', day))
  const result = homeProgress(previous, '2026-11-23', 3, { ...defaultPlanner(), breaks: [{ start: '2026-11-17', end: '2026-11-18' }] })
  expect(result.streak).toBe(1)
  expect(result.history).toHaveLength(8)
  expect(result.current.score).toBe(0)
})
