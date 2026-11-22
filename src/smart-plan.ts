import { cadences, choreLibrary, type Cadence, type ChoreTemplate, type Condition, type Priority } from './chore-library'
import { offsetDay, type Schedule, type State } from './data'
import type { Rule } from './recurrence'

export const styles = { balanced: 'Spread through the week', weekdays: 'Prefer weekdays', weekend: 'Prefer weekends' } as const
export const cleaningModes = { essentials: 'Essentials', balanced: 'Balanced', thorough: 'Thorough' } as const
export const homeTypes = { apartment: 'Apartment or condo', townhouse: 'Townhouse', house: 'Detached house', other: 'Other' } as const
export type PlanSettings = { budget: number; style: keyof typeof styles; restDays: number[]; breaks?: { start: string; end: string }[] }
export type Answers = {
  home: keyof typeof homeTypes; bedrooms: number; bathrooms: number; occupants: number; kit: Condition[]
  cleaning: keyof typeof cleaningModes
}
export type ChorePlan = { templateId?: string; minutes: number; priority: Priority; cadence?: Cadence; flexible: boolean }
export type Suggestion = { template: ChoreTemplate; minutes: number; cadence: Cadence; enabled: boolean; firstDue: string }
export type SmartPreferences = {
  setupDismissed: boolean; answers?: Answers; planner: PlanSettings
  lastImport?: { records: Schedule[] }
  progress: { enabled: boolean; goal: 3 | 5 | 7 }
}

export const defaultAnswers = (): Answers => ({ home: 'apartment', bedrooms: 1, bathrooms: 1, occupants: 1, kit: ['hard'], cleaning: 'balanced' })
export const defaultPlanner = (): PlanSettings => ({ budget: 20, style: 'balanced', restDays: [] })
export const defaultSmart = (): SmartPreferences => ({ setupDismissed: false, planner: defaultPlanner(), progress: { enabled: false, goal: 5 } })
export const priorityOrder: Record<Priority, number> = { critical: 0, high: 1, normal: 2, low: 3 }
export const onDemand = (task: Schedule) => !!task.plan && (task.plan.cadence === 'afterUse' || task.plan.cadence === 'asNeeded')
export const estimatedMinutes = (task: Schedule) => task.plan?.minutes ?? 10

export function ruleFor(cadence: Cadence, date: string): Rule {
  switch (cadence) {
    case 'daily': return { mode: 'daily' }
    case 'weekly': return { mode: 'weekly' }
    case 'monthly': return { mode: 'monthly', monthDay: Number(date.slice(-2)) }
    case 'fortnight': return { mode: 'interval', days: 14 }
    case 'quarterly': return { mode: 'interval', days: 90 }
    case 'semiannual': return { mode: 'interval', days: 182 }
    case 'annual': return { mode: 'interval', days: 365 }
    default: return { mode: 'once' }
  }
}

const normalized = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^\p{Letter}\p{Number}]+/gu, '')
const aliases = new Map(choreLibrary.flatMap(row => [row.name, ...row.aliases].map(name => [normalized(name), row.id] as const)))
export function isDuplicate(template: ChoreTemplate, rows: Schedule[]) {
  return rows.some(row => row.plan?.templateId === template.id || aliases.get(normalized(row.name)) === template.id)
}

export function isBreakDay(day: string, settings: PlanSettings) {
  return settings.breaks?.some(range => day >= range.start && day <= range.end) ?? false
}

export function isRestDay(day: string, settings: PlanSettings) {
  return settings.restDays.includes(new Date(day + 'T12:00:00').getDay()) || isBreakDay(day, settings)
}

export function datePreference(day: string, settings: PlanSettings) {
  const weekday = new Date(day + 'T12:00:00').getDay()
  const weekend = weekday === 0 || weekday === 6
  return settings.style === 'balanced' || weekend === (settings.style === 'weekend') ? 0 : 1
}

function matches(template: ChoreTemplate, answers: Answers) {
  const enabled = new Set(answers.kit)
  if (answers.bedrooms > 0) enabled.add('bedroom')
  if (enabled.has('dog') || enabled.has('cat')) enabled.add('pet')
  if (enabled.has('baby')) enabled.add('children')
  if (enabled.has('keurig')) enabled.add('coffee')
  if (answers.bathrooms === 0 && template.category === 'Bathrooms') return false
  return template.conditions.every(condition => enabled.has(condition))
}

function estimate(template: ChoreTemplate, answers: Answers) {
  const count = template.category === 'Bedrooms' ? answers.bedrooms :
    template.category === 'Bathrooms' ? answers.bathrooms :
    template.category === 'Laundry' && template.id === 'laundry' ? Math.ceil(answers.occupants / 2) :
    template.category === 'Floors' && answers.home === 'house' && template.tier === 'core' ? Math.max(1, answers.bedrooms / 2) : 1
  return Math.min(180, Math.ceil(template.minutes * Math.max(1, count)))
}

export function starterSuggestions(answers: Answers, settings: PlanSettings, existing: Schedule[], today: string): Suggestion[] {
  const tiers = { core: 0, standard: 1, deep: 2 }
  const count = answers.cleaning === 'essentials' ? 10 : answers.cleaning === 'thorough' ? 25 : 16
  const matchesHere = choreLibrary.filter(template => matches(template, answers)).sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] || tiers[a.tier] - tiers[b.tier])
  const days = Array.from({ length: 7 }, (_, index) => offsetDay(today, index))
  const loads = new Map(days.map(day => [day, 0]))
  let selected = 0
  let dailyMinutes = 0
  const suggestions = matchesHere.map(template => {
    const minutes = estimate(template, answers)
    const manual = template.cadence === 'afterUse' || template.cadence === 'asNeeded'
    const daily = template.cadence === 'daily'
    const fits = template.tier === 'core' || (template.tier === 'standard' && answers.cleaning !== 'essentials') || answers.cleaning === 'thorough'
    const enabled = !isDuplicate(template, existing) && (template.priority === 'critical' ||
      (!manual && fits && selected < count && (!daily || dailyMinutes + minutes <= settings.budget)))
    if (enabled && !manual) {
      selected++
      if (daily) {
        dailyMinutes += minutes
        for (const day of days) loads.set(day, loads.get(day)! + minutes)
      } else if (template.priority === 'critical') loads.set(today, loads.get(today)! + minutes)
    }
    return { template, minutes, cadence: template.cadence, enabled, firstDue: today }
  })
  for (const suggestion of suggestions) {
    const { cadence, template, minutes, enabled } = suggestion
    if (template.priority === 'critical' || cadence === 'daily' || cadence === 'afterUse' || cadence === 'asNeeded') continue
    const preferred = days.filter(day => !isRestDay(day, settings)).sort((a, b) =>
      Math.max(0, loads.get(a)! + minutes - settings.budget) - Math.max(0, loads.get(b)! + minutes - settings.budget) ||
      datePreference(a, settings) - datePreference(b, settings) || loads.get(a)! - loads.get(b)! || a.localeCompare(b))
    suggestion.firstDue = preferred[0] ?? today
    if (enabled) loads.set(suggestion.firstDue, loads.get(suggestion.firstDue)! + minutes)
  }
  return suggestions
}

export function draftRecord(suggestion: Suggestion, id: string): Schedule {
  const { template, cadence, minutes, firstDue: date } = suggestion
  const rule = ruleFor(cadence, date)
  return {
    id, name: template.name, date, notes: template.instructions, lastDone: '', interval: rule.days ?? 0, rule,
    plan: { templateId: template.id, minutes, cadence, priority: template.priority, flexible: template.priority !== 'critical' && cadence !== 'afterUse' && cadence !== 'asNeeded' },
  }
}

export function importSuggestions(suggestions: Suggestion[], state: State, id: () => string) {
  const rows = [...state.chores]
  const records: Schedule[] = []
  const duplicates = [...state.medication, ...state.vet, ...state.maintenance]
  for (const suggestion of suggestions) {
    if (!suggestion.enabled || isDuplicate(suggestion.template, rows) || isDuplicate(suggestion.template, duplicates)) continue
    const record = draftRecord(suggestion, id())
    records.push(record)
    rows.push(record)
  }
  return { data: { ...state, chores: rows }, records }
}

export function undoImport(state: State, records: Schedule[]) {
  const original = new Map(records.map(task => [task.id, JSON.stringify(task)]))
  const used = new Set(state.routines?.flatMap(routine => routine.choreIds))
  const chores = state.chores.filter(task => used.has(task.id) || original.get(task.id) !== JSON.stringify(task))
  return { data: { ...state, chores }, removed: state.chores.length - chores.length }
}

export function scheduleLabel(record: Schedule) {
  return record.plan?.cadence ? cadences[record.plan.cadence] : undefined
}
