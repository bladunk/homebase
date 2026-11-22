export const widgetDefinitions = {
  today: { label: 'Today’s chores', color: 'forest', icon: 'clipboard' },
  pantry: { label: 'Pantry', color: 'terracotta', icon: 'pantry' },
  shopping: { label: 'Shopping', color: 'brass', icon: 'basket' },
  calendar: { label: 'Calendar', color: 'slate', icon: 'calendar' },
  dog: { label: 'Dog care', color: 'terracotta', icon: 'paw' },
  maintenance: { label: 'Maintenance', color: 'forest', icon: 'tools' },
  attention: { label: 'Needs attention', color: 'brass', icon: 'bell' },
  routines: { label: 'Routines', color: 'forest', icon: 'sparkles' },
  expiry: { label: 'Expiring pantry items', color: 'terracotta', icon: 'clock' },
  favorites: { label: 'Favorite products', color: 'slate', icon: 'heart' },
  activity: { label: 'Category activity', color: 'slate', icon: 'tag' },
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
  tools: 'Tools', bell: 'Bell', leaf: 'Leaf', home: 'House', sparkles: 'Sparkles', heart: 'Heart', coffee: 'Coffee', clock: 'Clock', tag: 'Tag',
} as const

export type WidgetId = keyof typeof widgetDefinitions
export type Theme = keyof typeof themeOptions
export type CategoryColor = keyof typeof categoryColors
export type IconId = keyof typeof iconLabels
export const textures = { paper: 'Paper', weave: 'Linen weave', grid: 'Grid', plain: 'Smooth' } as const
export const displayStyles = { auto: 'Summary', list: 'List', metric: 'Metric' } as const
export type Section = { id: string; name: string }
export type WidgetPreference = {
  id: string; kind: WidgetId; visible: boolean; color: CategoryColor; icon: IconId
  sectionId: string; size: 'half' | 'full'; style: keyof typeof displayStyles; categoryId?: string
}
export type DashboardPreferences = {
  layoutVersion: 3; theme: Theme; density: 'compact' | 'expanded'; texture: keyof typeof textures
  accent: string; sections: Section[]; widgets: WidgetPreference[]
}

export const preferencesKey = 'homebase-dashboard-v1'
export const widgetIds = Object.keys(widgetDefinitions) as WidgetId[]
export const originalWidgetIds = widgetIds.slice(0, 7)
export const mainSection = { id: 'main', name: 'Overview' }

export function defaultWidget(kind: WidgetId, id: string = kind): WidgetPreference {
  const { color, icon } = widgetDefinitions[kind]
  return { id, kind, visible: true, color, icon, sectionId: mainSection.id, size: kind === 'today' ? 'full' : 'half', style: 'auto' }
}

export function defaultPreferences(): DashboardPreferences {
  return { layoutVersion: 3, theme: 'dusk', density: 'compact', texture: 'paper', accent: '',
    sections: [mainSection], widgets: originalWidgetIds.map(id => defaultWidget(id)) }
}

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasKey<T extends object>(options: T, value: unknown): value is keyof T {
  return typeof value === 'string' && Object.hasOwn(options, value)
}

export function migratePreferences(parsed: unknown): DashboardPreferences {
  const defaults = defaultPreferences()
  if (!object(parsed)) return defaults
  const legacy = parsed.layoutVersion !== 3
  const sectionIds = new Set([mainSection.id])
  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
  const primary = rawSections.find(item => object(item) && item.id === mainSection.id)
  const sections = [{ ...mainSection, name: typeof primary?.name === 'string' && primary.name.trim() ? primary.name : mainSection.name }]
  for (const item of rawSections) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || sectionIds.has(item.id) ||
      typeof item.name !== 'string' || !item.name.trim()) continue
    sections.push({ id: item.id, name: item.name })
    sectionIds.add(item.id)
  }
  // The primary section can be moved too. Recover its position from a valid saved order.
  const orderedSections = rawSections.flatMap(item => sections.filter(section => section.id === item?.id))
  const uniqueSections = [...new Map([...orderedSections, ...sections].map(section => [section.id, section])).values()]
  const widgets: WidgetPreference[] = []
  for (const item of Array.isArray(parsed.widgets) ? parsed.widgets : []) {
    if (!object(item) || typeof item.id !== 'string' || !item.id || widgets.some(widget => widget.id === item.id)) continue
    const kind = legacy ? item.id : item.kind
    if (!hasKey(widgetDefinitions, kind)) continue
    const fallback = defaultWidget(kind, item.id)
    widgets.push({
      ...fallback,
      visible: typeof item.visible === 'boolean' ? item.visible : fallback.visible,
      color: hasKey(categoryColors, item.color) ? item.color : fallback.color,
      icon: hasKey(iconLabels, item.icon) ? item.icon : fallback.icon,
      sectionId: typeof item.sectionId === 'string' && sectionIds.has(item.sectionId) ? item.sectionId : fallback.sectionId,
      size: item.size === 'full' || item.size === 'half' ? item.size : fallback.size,
      style: hasKey(displayStyles, item.style) ? item.style : 'auto',
      categoryId: typeof item.categoryId === 'string' ? item.categoryId : undefined,
    })
  }
  if (legacy) {
    for (const id of originalWidgetIds) {
      if (!widgets.some(widget => widget.id === id)) widgets.push(defaultWidget(id))
    }
  }
  return {
    ...defaults, widgets, sections: uniqueSections,
    theme: hasKey(themeOptions, parsed.theme) ? parsed.theme : 'dusk',
    density: parsed.density === 'expanded' ? 'expanded' : 'compact',
    texture: hasKey(textures, parsed.texture) ? parsed.texture : 'paper',
    accent: typeof parsed.accent === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.accent) ? parsed.accent : '',
  }
}

export function loadPreferences(storage: Pick<Storage, 'getItem'>): DashboardPreferences {
  try {
    const saved = storage.getItem(preferencesKey)
    return saved ? migratePreferences(JSON.parse(saved)) : defaultPreferences()
  } catch {
    return defaultPreferences()
  }
}

export function moveWidget(widgets: WidgetPreference[], id: string, offset: -1 | 1) {
  const from = widgets.findIndex(widget => widget.id === id)
  if (from < 0) return widgets
  const peers = widgets.filter(widget => widget.sectionId === widgets[from].sectionId)
  const neighbor = peers[peers.findIndex(widget => widget.id === id) + offset]
  if (!neighbor) return widgets
  const to = widgets.indexOf(neighbor)
  const next = [...widgets]
  next[to] = widgets[from]
  next[from] = widgets[to]
  return next
}
