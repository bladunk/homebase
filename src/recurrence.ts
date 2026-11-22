import { onDemand, scheduleLabel } from './smart-plan'
import { dayKey, isDate, offsetDay, type Schedule } from './data'

export const recurrenceLabels = {
  once: 'One time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  weekdays: 'Specific weekdays', interval: 'Custom interval', completion: 'Days after completion',
} as const
export type RecurrenceMode = keyof typeof recurrenceLabels
export type Rule = { mode: RecurrenceMode; days?: number; weekdays?: number[]; monthDay?: number }
export type Occurrence = Pick<Schedule, 'date' | 'lastDone' | 'snoozedUntil' | 'skipped'>
export type TaskAction = 'complete' | 'skip' | 'snooze'
export type TaskLog = { action: TaskAction; day: string; before: Occurrence; after: Occurrence; undone?: boolean }

export function taskRule(task: Schedule): Rule {
  return task.rule ?? (task.interval ? { mode: 'completion', days: task.interval } : { mode: 'once' })
}

export function dueDate(task: Schedule) {
  return task.snoozedUntil && task.snoozedUntil > task.date ? task.snoozedUntil : task.date
}

export function isActive(task: Schedule) {
  return onDemand(task) || taskRule(task).mode !== 'once' || (!task.lastDone && !task.skipped)
}

export function canComplete(task: Schedule, today: string) {
  return isActive(task) && (onDemand(task) || task.lastDone !== today || task.date <= today)
}

function weekday(date: string) {
  return new Date(date + 'T12:00:00').getDay()
}

function nextDate(task: Schedule, today: string, action: TaskAction) {
  const rule = taskRule(task)
  const cutoff = task.date > today ? task.date : today
  switch (rule.mode) {
    case 'once': return task.date
    case 'completion':
      return offsetDay(task.rule && action === 'complete' ? today : cutoff, rule.days ?? 1)
    case 'monthly': {
      const base = new Date(cutoff + 'T12:00:00')
      const anchor = rule.monthDay ?? Number(task.date.slice(-2))
      const inMonth = (month: number) => {
        const result = new Date(base)
        result.setDate(1)
        result.setMonth(result.getMonth() + month)
        const last = new Date(result)
        last.setMonth(last.getMonth() + 1, 0)
        result.setDate(Math.min(anchor, last.getDate()))
        return dayKey(result)
      }
      if (task.date.slice(0, 7) === cutoff.slice(0, 7)) return inMonth(1)
      const candidate = inMonth(0)
      return candidate > cutoff ? candidate : inMonth(1)
    }
    case 'weekdays': {
      const current = weekday(cutoff)
      const offsets = (rule.weekdays ?? []).map(day => (day - current + 6) % 7 + 1)
      return offsetDay(cutoff, offsets.length ? Math.min(...offsets) : 1)
    }
    default: {
      const step = rule.mode === 'weekly' ? 7 : rule.mode === 'interval' ? rule.days ?? 1 : 1
      const elapsed = (Date.parse(cutoff) - Date.parse(task.date)) / 86_400_000
      return offsetDay(task.date, (Math.floor(elapsed / step) + 1) * step)
    }
  }
}

export function forecastNext(task: Schedule, assumedCompletion: string) {
  if (onDemand(task) || taskRule(task).mode === 'once') return undefined
  const next = nextDate(task, assumedCompletion, 'complete')
  return isDate(next) ? next : undefined
}

function occurrence(task: Schedule): Occurrence {
  return { date: task.date, lastDone: task.lastDone, snoozedUntil: task.snoozedUntil, skipped: task.skipped }
}

function equals(a: Occurrence, b: Occurrence) {
  return a.date === b.date && a.lastDone === b.lastDone && a.snoozedUntil === b.snoozedUntil && a.skipped === b.skipped
}

export function applyTaskAction(task: Schedule, action: TaskAction, today: string, until?: string): Schedule {
  if (!isActive(task) || (onDemand(task) && action !== 'complete')) return task
  if (action === 'snooze' && (!isDate(until) || until <= today || until <= dueDate(task))) return task
  if (action === 'complete' && !canComplete(task, today)) return task
  const before = occurrence(task)
  const after: Occurrence = action === 'snooze' ? { ...before, snoozedUntil: until } : {
    date: onDemand(task) ? today : nextDate(task, today, action),
    lastDone: action === 'complete' ? today : task.lastDone,
    skipped: action === 'skip' && taskRule(task).mode === 'once' ? true : undefined,
  }
  if (!isDate(after.date)) return task
  return { ...task, ...after, snoozedUntil: after.snoozedUntil, history: [...(task.history ?? []), { action, day: today, before, after }] }
}

function undoIndex(task: Schedule) {
  const history = task.history ?? []
  for (let index = history.length - 1; index >= 0; index--) {
    if (!history[index].undone) return equals(occurrence(task), history[index].after) ? index : -1
  }
  return -1
}

export const canUndo = (task: Schedule) => undoIndex(task) !== -1

export function undoTask(task: Schedule): Schedule {
  const history = task.history ?? []
  const index = undoIndex(task)
  if (index === -1) return task
  const before = history[index].before
  return { ...task, ...before, snoozedUntil: before.snoozedUntil, skipped: before.skipped,
    history: history.map((entry, position) => position === index ? { ...entry, undone: true } : entry) }
}

export function ruleDescription(task: Schedule) {
  if (onDemand(task)) return scheduleLabel(task) ?? 'As needed'
  const rule = taskRule(task)
  if (rule.mode === 'interval' || rule.mode === 'completion') {
    return 'Every ' + rule.days + (rule.days === 1 ? ' day' : ' days') + (rule.mode === 'completion' && task.rule ? ' after completion' : '')
  }
  return recurrenceLabels[rule.mode]
}
