export const widgetDefinitions = {
  today: { label: 'Today’s chores', color: 'forest', icon: 'clipboard' },
  pantry: { label: 'Pantry', color: 'terracotta', icon: 'pantry' },
  shopping: { label: 'Shopping', color: 'brass', icon: 'basket' },
  calendar: { label: 'Calendar', color: 'slate', icon: 'calendar' },
  dog: { label: 'Dog care', color: 'terracotta', icon: 'paw' },
  maintenance: { label: 'Maintenance', color: 'forest', icon: 'tools' },
  attention: { label: 'Needs attention', color: 'brass', icon: 'bell' },
} as const

export const themeOptions = {
  linen: { label: 'Linen', description: 'Warm paper and forest green', swatches: ['#E9E3D4', '#234B3A', '#B86F53'] },
  grove: { label: 'Grove', description: 'Sage and soft olive', swatches: ['#D8E5D8', '#325343', '#8C713F'] },
  dusk: { label: 'Dusk', description: 'Deep slate and muted brass', swatches: ['#1B2630', '#7897A5', '#C9A45C'] },
} as const

export const categoryColors = {
  forest: 'Forest', terracotta: 'Terracotta', brass: 'Brass', slate: 'Slate blue',
} as const

export const iconLabels = {
  clipboard: 'Checklist', pantry: 'Container', basket: 'Basket', calendar: 'Calendar', paw: 'Paw',
  tools: 'Tools', bell: 'Bell', leaf: 'Leaf', home: 'House', sparkles: 'Sparkles', heart: 'Heart', coffee: 'Coffee',
} as const

export type WidgetId = keyof typeof widgetDefinitions
export type Theme = keyof typeof themeOptions
export type CategoryColor = keyof typeof categoryColors
export type IconId = keyof typeof iconLabels
export type WidgetPreference = { id: WidgetId; visible: boolean; color: CategoryColor; icon: IconId }
export type DashboardPreferences = { theme: Theme; widgets: WidgetPreference[] }

export const preferencesKey = 'homebase-dashboard-v1'
export const widgetIds = Object.keys(widgetDefinitions) as WidgetId[]

function defaultWidget(id: WidgetId): WidgetPreference {
  const { color, icon } = widgetDefinitions[id]
  return { id, visible: true, color, icon }
}

export function defaultPreferences(): DashboardPreferences {
  return { theme: 'linen', widgets: widgetIds.map(defaultWidget) }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasKey<T extends object>(options: T, value: unknown): value is keyof T {
  return typeof value === 'string' && Object.hasOwn(options, value)
}

export function loadPreferences(storage: Pick<Storage, 'getItem'>): DashboardPreferences {
  try {
    const saved = storage.getItem(preferencesKey)
    if (!saved) return defaultPreferences()
    const parsed: unknown = JSON.parse(saved)
    if (!object(parsed)) return defaultPreferences()
    const widgets: WidgetPreference[] = []
    for (const item of Array.isArray(parsed.widgets) ? parsed.widgets : []) {
      if (!object(item) || !hasKey(widgetDefinitions, item.id) || widgets.some(widget => widget.id === item.id)) continue
      const defaults = defaultWidget(item.id)
      widgets.push({
        ...defaults,
        visible: typeof item.visible === 'boolean' ? item.visible : defaults.visible,
        color: hasKey(categoryColors, item.color) ? item.color : defaults.color,
        icon: hasKey(iconLabels, item.icon) ? item.icon : defaults.icon,
      })
    }
    for (const id of widgetIds) {
      if (!widgets.some(widget => widget.id === id)) widgets.push(defaultWidget(id))
    }
    return { theme: hasKey(themeOptions, parsed.theme) ? parsed.theme : 'linen', widgets }
  } catch {
    return defaultPreferences()
  }
}

export function moveWidget(widgets: WidgetPreference[], id: WidgetId, offset: -1 | 1) {
  const from = widgets.findIndex(widget => widget.id === id)
  const to = from + offset
  if (from < 0 || to < 0 || to >= widgets.length) return widgets
  const next = [...widgets]
  next[to] = widgets[from]
  next[from] = widgets[to]
  return next
}
