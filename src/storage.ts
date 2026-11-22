import { collections, isDate, isName, isObject, parseBackup, scheduled, storageKey, type State } from './data'
import { categoryColors, displayStyles, hasKey, iconLabels, loadPreferences, mainSection, migratePreferences, textures, themeOptions, widgetDefinitions, type DashboardPreferences } from './dashboard-preferences'
import { cadences, conditions } from './chore-library'
import { cleaningModes, defaultSmart, homeTypes, priorityOrder, styles, type SmartPreferences } from './smart-plan'
import { recurrenceLabels } from './recurrence'

export const v3Key = 'homebase-v3'

export const v4Key = 'homebase-v4'
export type Snapshot = { version: 4; data: State; dashboard: DashboardPreferences; smart: SmartPreferences }


function validRule(rule: unknown) {
  if (!isObject(rule) || !hasKey(recurrenceLabels, rule.mode)) return false
  if (rule.mode === 'interval' || rule.mode === 'completion') return typeof rule.days === 'number' && Number.isInteger(rule.days) && rule.days >= 1 && rule.days <= 36500
  if (rule.mode === 'monthly') return typeof rule.monthDay === 'number' && Number.isInteger(rule.monthDay) && rule.monthDay >= 1 && rule.monthDay <= 31
  if (rule.mode === 'weekdays') return Array.isArray(rule.weekdays) && rule.weekdays.length > 0 &&
    new Set(rule.weekdays).size === rule.weekdays.length && rule.weekdays.every(day => Number.isInteger(day) && day >= 0 && day <= 6)
  return true
}

function validOccurrence(item: unknown) {
  return isObject(item) && isDate(item.date) && (item.lastDone === '' || isDate(item.lastDone)) &&
    (item.snoozedUntil === undefined || isDate(item.snoozedUntil)) && (item.skipped === undefined || typeof item.skipped === 'boolean')
}

function checkData(raw: unknown) {
  const data = parseBackup(JSON.stringify(raw))
  const validRows = (rows: unknown, validate: (item: Record<string, unknown>) => boolean) => {
    if (rows === undefined) return true
    const ids = new Set<string>()
    return Array.isArray(rows) && rows.every(item => {
      if (!isObject(item) || !isName(item.id) || !isName(item.name) || ids.has(item.id) || !validate(item)) return false
      ids.add(item.id)
      return true
    })
  }
  const validRoutines = validRows(data.routines, item => {
    const ids = item.choreIds
    return Array.isArray(ids) && new Set(ids).size === ids.length &&
      ids.every(id => typeof id === 'string' && data.chores.some(chore => chore.id === id)) &&
      (item.checkoffs === undefined || (isObject(item.checkoffs) &&
        Object.entries(item.checkoffs).every(([id, date]) => ids.includes(id) && isDate(date))))
  })
  const validCategories = validRows(data.categories, item => hasKey(categoryColors, item.color) && hasKey(iconLabels, item.icon))
  if (!validRoutines || !validCategories) throw new Error('The backup contains invalid categories or routines.')
  const categoryIds = new Set(data.categories?.map(category => category.id))
  const validRecords = collections.every(key => data[key].every(row => row.categoryId === undefined || categoryIds.has(row.categoryId))) &&
    (data.routines ?? []).every(row => row.categoryId === undefined || categoryIds.has(row.categoryId))
  const validSchedules = scheduled.every(key => data[key].every(task => validOccurrence(task) &&
    (task.rule === undefined || validRule(task.rule)) &&
    (task.plan === undefined || validPlan(task.plan)) &&
    (task.history === undefined || (Array.isArray(task.history) && task.history.every(entry =>
      isObject(entry) && ['complete', 'skip', 'snooze'].includes(entry.action) && isDate(entry.day) &&
      validOccurrence(entry.before) && validOccurrence(entry.after) && (entry.undone === undefined || typeof entry.undone === 'boolean'))))))
  const validPantry = data.pantry.every(item => (item.expires === undefined || isDate(item.expires)) &&
    (item.favorite === undefined || typeof item.favorite === 'boolean'))
  if (!validRecords || !validSchedules || !validPantry) throw new Error('The backup contains invalid household records.')
  return data
}

function checkDashboard(raw: unknown, data: State) {
  if (!isObject(raw) || raw.layoutVersion !== 3 || !Array.isArray(raw.widgets) || !Array.isArray(raw.sections)) {
    throw new Error('The backup is missing a V3 dashboard layout.')
  }
  const sectionIds = new Set<string>()
  const widgetIds = new Set<string>()
  const categories = new Set(data.categories?.map(category => category.id))
  const validSections = raw.sections.every(section => {
    if (!isObject(section) || !isName(section.id) || !isName(section.name) || sectionIds.has(section.id)) return false
    sectionIds.add(section.id)
    return true
  }) && sectionIds.has(mainSection.id)
  const validWidgets = raw.widgets.every(widget => {
    if (!isObject(widget) || !isName(widget.id) || widgetIds.has(widget.id) || !hasKey(widgetDefinitions, widget.kind) ||
      !hasKey(categoryColors, widget.color) || !hasKey(iconLabels, widget.icon) || typeof widget.visible !== 'boolean' ||
      !isName(widget.sectionId) || !sectionIds.has(widget.sectionId) || (widget.size !== 'full' && widget.size !== 'half') ||
      !hasKey(displayStyles, widget.style) || (widget.categoryId !== undefined &&
        (typeof widget.categoryId !== 'string' || !categories.has(widget.categoryId)))) return false
    widgetIds.add(widget.id)
    return true
  })
  if (!validSections || !validWidgets || !hasKey(themeOptions, raw.theme) || !hasKey(textures, raw.texture) ||
    (raw.density !== 'compact' && raw.density !== 'expanded') ||
    (raw.accent !== '' && (typeof raw.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.accent)))) {
    throw new Error('The backup contains an invalid V3 dashboard layout.')
  }
  return migratePreferences(raw)
}

function integer(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function validPlan(raw: unknown) {
  return isObject(raw) && (raw.templateId === undefined || isName(raw.templateId)) &&
    integer(raw.minutes, 1, 600) && hasKey(priorityOrder, raw.priority) && (raw.cadence === undefined || hasKey(cadences, raw.cadence)) &&
    typeof raw.flexible === 'boolean'
}

function checkSmart(raw: unknown): SmartPreferences {
  if (!isObject(raw) || typeof raw.setupDismissed !== 'boolean' || !isObject(raw.planner) || !isObject(raw.progress)) {
    throw new Error('The backup is missing V4 planning settings.')
  }
  const { answers, planner, progress, lastImport } = raw
  const validAnswers = answers === undefined || (isObject(answers) && hasKey(homeTypes, answers.home) &&
    integer(answers.bedrooms, 0, 20) && integer(answers.bathrooms, 0, 20) && integer(answers.occupants, 1, 30) &&
    hasKey(cleaningModes, answers.cleaning) && Array.isArray(answers.kit) && answers.kit.every(item => hasKey(conditions, item)))
  const validBreaks = planner.breaks === undefined || (Array.isArray(planner.breaks) && planner.breaks.every(range =>
    isObject(range) && isDate(range.start) && isDate(range.end) && range.end >= range.start))
  const validPlanner = validBreaks && integer(planner.budget, 5, 240) && hasKey(styles, planner.style) &&
    Array.isArray(planner.restDays) && planner.restDays.every(day => integer(day, 0, 6))
  const validProgress = typeof progress.enabled === 'boolean' && (progress.goal === 3 || progress.goal === 5 || progress.goal === 7)
  const validImport = lastImport === undefined || (isObject(lastImport) && Array.isArray(lastImport.records) &&
    lastImport.records.every(row => isObject(row) && isName(row.id) && isName(row.name) && validOccurrence(row) && validPlan(row.plan)))
  if (!validAnswers || !validPlanner || !validProgress || !validImport) throw new Error('The backup contains invalid V4 planning settings.')
  return raw as unknown as SmartPreferences
}

export function readBackup(text: string, currentDashboard: DashboardPreferences, currentSmart = defaultSmart()): Snapshot {
  const raw: unknown = JSON.parse(text)
  if (isObject(raw) && (raw.version === 3 || raw.version === 4)) {
    const data = checkData(raw.data)
    const dashboard = checkDashboard(raw.dashboard, data)
    const smart = raw.version === 4 ? checkSmart(raw.smart) : { ...currentSmart, lastImport: undefined }
    return { version: 4, data, dashboard, smart }
  }
  const data = checkData(raw)
  const installedCategories = new Set(data.categories?.map(category => category.id))
  const widgets = currentDashboard.widgets.map(widget => widget.categoryId && !installedCategories.has(widget.categoryId)
    ? { ...widget, categoryId: undefined } : widget)
  return { version: 4, data, dashboard: { ...currentDashboard, widgets }, smart: { ...currentSmart, lastImport: undefined } }
}

function readInstalled(storage: Pick<Storage, 'getItem'>, key: string, version: number, dashboard: DashboardPreferences) {
  const stored = storage.getItem(key)
  if (stored === null) return undefined
  const raw: unknown = JSON.parse(stored)
  if (!isObject(raw) || raw.version !== version) throw new Error('Invalid HomeBase storage version.')
  return readBackup(stored, dashboard)
}

export function loadSnapshot(storage: Pick<Storage, 'getItem'>): {
  snapshot: Snapshot; empty: boolean; error: string; recovery?: Snapshot
} {
  const dashboard = loadPreferences(storage)
  const initial: Snapshot = {
    version: 4, data: { version: 1, chores: [], pantry: [], lists: [], groceries: [], medication: [], vet: [], calendar: [], maintenance: [] },
    dashboard, smart: defaultSmart(),
  }
  function legacy() {
    const v3 = readInstalled(storage, v3Key, 3, dashboard)
    if (v3) return v3
    return readInstalled(storage, storageKey, 1, dashboard)
  }
  try {
    const saved = readInstalled(storage, v4Key, 4, dashboard) ?? legacy()
    return { snapshot: saved ?? initial, empty: !saved, error: '' }
  } catch {
    // An unreadable current snapshot is left untouched until the user confirms a restore.
    let recovery: Snapshot | undefined
    try { recovery = legacy() } catch {
      try { recovery = readInstalled(storage, storageKey, 1, dashboard) } catch { /* No readable legacy copy. */ }
    }
    return { snapshot: initial, empty: false, recovery, error: 'HomeBase could not read the saved records. Restore a valid backup to resume editing.' }
  }
}

export function inaccessibleSnapshot() {
  return loadSnapshot({ getItem: () => { throw new Error('Storage unavailable') } })
}
