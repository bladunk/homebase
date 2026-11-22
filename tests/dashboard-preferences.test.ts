import { describe, expect, it } from 'vitest'
import { defaultPreferences, defaultWidget, loadPreferences, migratePreferences, moveWidget, preferencesKey, originalWidgetIds } from '../src/dashboard-preferences'

describe('dashboard preferences', () => {
  it('uses defaults for missing, malformed, or unavailable preferences', () => {
    expect(loadPreferences({ getItem: () => null })).toEqual(defaultPreferences())
    expect(loadPreferences({ getItem: () => '{' })).toEqual(defaultPreferences())
    expect(loadPreferences({ getItem: () => { throw new Error('Storage unavailable') } })).toEqual(defaultPreferences())
  })

  it('preserves valid preferences and fills missing widgets and invalid settings', () => {
    const saved = JSON.stringify({
      theme: 'dusk',
      widgets: [
        { id: 'pantry', visible: false, color: 'slate', icon: 'coffee' },
        { id: 'pantry', visible: true },
        { id: 'attention', visible: 'yes', color: 'toString', icon: 'constructor' },
        { id: 'unknown', visible: false },
      ],
    })
    const restored = loadPreferences({ getItem: key => {
      expect(key).toBe(preferencesKey)
      return saved
    } })
    expect(restored.theme).toBe('dusk')
    expect(restored.widgets[0]).toMatchObject({ id: 'pantry', kind: 'pantry', visible: false, color: 'slate', icon: 'coffee' })
    expect(restored.widgets[1]).toMatchObject({ id: 'attention', kind: 'attention', visible: true, color: 'brass', icon: 'bell' })
    expect(restored.widgets.map(widget => widget.id)).toEqual(['pantry', 'attention', ...originalWidgetIds.filter(id => id !== 'pantry' && id !== 'attention')])
  })

  it('moves a widget without mutating the current order and respects bounds', () => {
    const { widgets } = defaultPreferences()
    expect(moveWidget(widgets, 'today', -1)).toBe(widgets)
    const reordered = moveWidget(widgets, 'pantry', -1)
    expect(reordered.slice(0, 2).map(widget => widget.id)).toEqual(['pantry', 'today'])
    expect(widgets.map(widget => widget.id)).toEqual(originalWidgetIds)
  })

  it('round-trips section order and appearance, including removed widgets', () => {
    const preferences = {
      ...defaultPreferences(),
      accent: '#7b95b2', texture: 'grid', density: 'expanded',
      sections: [{ id: 'morning', name: 'Morning' }, { id: 'main', name: 'Overview' }],
      widgets: [
        { ...defaultWidget('routines'), sectionId: 'morning', style: 'list', size: 'full' },
        { ...defaultWidget('activity', 'kitchen-widget'), categoryId: 'kitchen', sectionId: 'morning' },
      ],
    }
    expect(migratePreferences(JSON.parse(JSON.stringify(preferences)))).toEqual(preferences)
    expect(migratePreferences({ ...preferences, widgets: [] }).widgets).toEqual([])
  })
})
