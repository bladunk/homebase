import { offsetDay, type Schedule } from './data'
import { isBreakDay, isRestDay, type PlanSettings } from './smart-plan'

export const goalLabels = { 3: 'Gentle pace', 5: 'Steady pace', 7: 'Daily pace' } as const
export type Goal = keyof typeof goalLabels

export function mondayOf(day: string) {
  return offsetDay(day, -((new Date(day + 'T12:00:00').getDay() + 6) % 7))
}

export function completionDays(tasks: Schedule[], today: string) {
  const days = new Map<string, number>()
  for (const task of tasks) {
    // Limit credit to one completion per chore per local day, even for manual chores.
    const recorded = new Set(task.history?.filter(entry => entry.action === 'complete' && !entry.undone).map(entry => entry.day))
    if (task.lastDone) recorded.add(task.lastDone)
    for (const day of recorded) {
      if (day <= today) days.set(day, (days.get(day) ?? 0) + 1)
    }
  }
  return days
}

export function weeklyScore(monday: string, today: string, goal: Goal, settings: PlanSettings, days: Map<string, number>) {
  const dates = Array.from({ length: 7 }, (_, index) => offsetDay(monday, index))
  const elapsed = dates.filter(day => day <= today)
  const available = dates.filter(day => !isRestDay(day, settings)).length
  const target = Math.min(goal, available)
  const active = elapsed.filter(day => !isRestDay(day, settings) && days.has(day)).length
  const completions = elapsed.reduce((sum, day) => sum + (days.get(day) ?? 0), 0)
  const interrupted = dates.some(day => isBreakDay(day, settings))
  return { monday, target, active, completions, interrupted, score: target ? Math.min(100, Math.round(active * 100 / target)) : null }
}

export function homeProgress(tasks: Schedule[], today: string, goal: Goal, settings: PlanSettings) {
  const days = completionDays(tasks, today)
  const monday = mondayOf(today)
  const history = Array.from({ length: 8 }, (_, index) => weeklyScore(offsetDay(monday, (index - 7) * 7), today, goal, settings, days))
  const firstDay = [...days.keys()].sort()[0]
  let streak = 0
  const completedWeeks = new Set([...days.keys()].map(mondayOf))
  const atGoal = [...completedWeeks].some(start => weeklyScore(start, today, goal, settings, days).score === 100)
  for (let offset = 0; firstDay; offset -= 7) {
    const start = offsetDay(monday, offset)
    if (start < mondayOf(firstDay)) break
    const week = weeklyScore(start, today, goal, settings, days)
    if (week.target === 0 || (week.interrupted && week.score !== 100)) continue
    // This week's unfinished goal never breaks the previous streak midweek.
    if (offset === 0 && week.score !== 100) continue
    if (week.score !== 100) break
    streak++
  }
  const total = [...days.values()].reduce((sum, count) => sum + count, 0)
  const xp = total * 10
  const badges = [
    ...(total > 0 ? ['First finish'] : []),
    ...(total >= 25 ? ['25 chore completions'] : []),
    ...(atGoal ? ['Weekly goal reached'] : []),
    ...(streak >= 3 ? ['Three-week rhythm'] : []),
  ]
  return { history, current: history[history.length - 1], xp, level: Math.floor(xp / 100) + 1, badges, streak }
}
