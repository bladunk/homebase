import { collections, isDate, isName, isObject, parseBackup, scheduled, seed, storageKey, type State } from './data'
import { categoryColors, displayStyles, hasKey, iconLabels, loadPreferences, mainSection, migratePreferences, textures, themeOptions, widgetDefinitions, type DashboardPreferences } from './dashboard-preferences'
import { recurrenceLabels } from './recurrence'

export const v3Key = 'homebase-v3'

export type Snapshot = { version: 3; data: State; dashboard: DashboardPreferences }

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

export function readBackup(text: string, currentDashboard: DashboardPreferences): Snapshot {
  const raw: unknown = JSON.parse(text)
  if (isObject(raw) && raw.version === 3) {
    const data = checkData(raw.data)
    return { version: 3, data, dashboard: checkDashboard(raw.dashboard, data) }
  }
  const data = checkData(raw)
  const installedCategories = new Set(data.categories?.map(category => category.id))
  const widgets = currentDashboard.widgets.map(widget => widget.categoryId && !installedCategories.has(widget.categoryId)
    ? { ...widget, categoryId: undefined } : widget)
  return { version: 3, data, dashboard: { ...currentDashboard, widgets } }
}

export function loadSnapshot(storage: Pick<Storage, 'getItem'>) {
  const dashboard = loadPreferences(storage)
  const initial: Snapshot = { version: 3, data: seed(), dashboard }
  try {
    const newer = storage.getItem(v3Key)
    if (newer !== null) {
      const raw: unknown = JSON.parse(newer)
      if (!isObject(raw) || raw.version !== 3) throw new Error('Invalid V3 storage.')
      return { snapshot: readBackup(newer, dashboard), empty: false, error: '' }
    }
    const legacy = storage.getItem(storageKey)
    return { snapshot: legacy === null ? initial : readBackup(legacy, dashboard), empty: legacy === null, error: '' }
  } catch {
    // Preserve unreadable storage on disk. The sample view is read-only until a valid restore.
    return { snapshot: initial, empty: false, error: 'HomeBase could not read the saved records. Restore a valid backup to resume editing.' }
  }
}

export function inaccessibleSnapshot() {
  return loadSnapshot({ getItem: () => { throw new Error('Storage unavailable') } })
}
