import { offsetDay, type Schedule, type ScheduledCollection } from './data'
import { dueDate, forecastNext, isActive, taskRule } from './recurrence'
import { datePreference, estimatedMinutes, isRestDay, onDemand, priorityOrder, type PlanSettings } from './smart-plan'

export type TaskEntry = { collection: ScheduledCollection; task: Schedule }
export type PlannedTask = TaskEntry & { due: string; day?: string; minutes: number; fixed: boolean; projected: boolean }
export type PlanDay = { date: string; rest: boolean; minutes: number; tasks: PlannedTask[] }

export function isFixed({ collection, task }: TaskEntry) {
  const mode = taskRule(task).mode
  return collection !== 'chores' || !task.plan?.flexible || task.plan.priority === 'critical' ||
    !!task.snoozedUntil || mode === 'daily' || mode === 'weekdays' || mode === 'completion'
}

export function taskPriority(task: Schedule) {
  return priorityOrder[task.plan?.priority ?? 'normal']
}

export function orderDue(a: TaskEntry, b: TaskEntry, today: string) {
  const dateA = dueDate(a.task)
  const dateB = dueDate(b.task)
  return Number(dateB < today) - Number(dateA < today) ||
    taskPriority(a.task) - taskPriority(b.task) || dateA.localeCompare(dateB)
}

export function weekPlan(entries: TaskEntry[], today: string, settings: PlanSettings) {
  const days: PlanDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = offsetDay(today, index)
    return { date, rest: isRestDay(date, settings), minutes: 0, tasks: [] }
  })
  const end = days[days.length - 1].date
  const options: { row: PlannedTask; earliest: string; latest: string }[] = []
  const unplaced: PlannedTask[] = []
  const place = (row: PlannedTask, day: PlanDay) => {
    const scheduled = { ...row, day: day.date }
    day.tasks.push(scheduled)
    day.minutes += row.minutes
  }

  for (const entry of entries) {
    if (!isActive(entry.task) || onDemand(entry.task)) continue
    let occurrence = entry.task
    let projected = false
    for (let index = 0; index < 7; index++) {
      const due = dueDate(occurrence)
      if (due > end) break
      const earliest = due < today ? today : due
      const next = forecastNext(occurrence, earliest)
      const fixed = isFixed({ ...entry, task: occurrence })
      const row = { ...entry, due, minutes: estimatedMinutes(entry.task), fixed, projected }
      if (fixed) place(row, days.find(day => day.date === earliest)!)
      else options.push({ row, earliest, latest: next ? offsetDay(next, -1) : end })
      if (!next || next <= earliest || next > end) break
      occurrence = { ...occurrence, date: next, snoozedUntil: undefined }
      projected = true
    }
  }

  options.sort((a, b) => Number(b.row.due < today) - Number(a.row.due < today) ||
    taskPriority(a.row.task) - taskPriority(b.row.task) || a.row.due.localeCompare(b.row.due))
  for (const { row, earliest, latest } of options) {
    const available = days.filter(day => day.date >= earliest && day.date <= latest && !day.rest)
    available.sort((a, b) => {
      const overflowA = Math.max(0, a.minutes + row.minutes - settings.budget)
      const overflowB = Math.max(0, b.minutes + row.minutes - settings.budget)
      return overflowA - overflowB ||
        (row.due < today ? a.date.localeCompare(b.date) :
          datePreference(a.date, settings) - datePreference(b.date, settings) || a.minutes - b.minutes || a.date.localeCompare(b.date))
    })
    if (available[0]) place(row, available[0])
    else unplaced.push(row)
  }
  for (const day of days) day.tasks.sort((a, b) =>
    Number(b.due < today) - Number(a.due < today) || taskPriority(a.task) - taskPriority(b.task) || a.due.localeCompare(b.due))
  return { days, unplaced }
}
