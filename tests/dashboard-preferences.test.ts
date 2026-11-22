import { describe, expect, it } from 'vitest'
import { defaultPreferences, loadPreferences, moveWidget, preferencesKey, widgetIds } from '../src/dashboard-preferences'

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
    expect(restored.widgets[0]).toEqual({ id: 'pantry', visible: false, color: 'slate', icon: 'coffee' })
    expect(restored.widgets[1]).toEqual({ id: 'attention', visible: true, color: 'brass', icon: 'bell' })
    expect(restored.widgets.map(widget => widget.id)).toEqual(['pantry', 'attention', ...widgetIds.filter(id => id !== 'pantry' && id !== 'attention')])
  })

  it('moves a widget without mutating the current order and respects bounds', () => {
    const { widgets } = defaultPreferences()
    expect(moveWidget(widgets, 'today', -1)).toBe(widgets)
    const reordered = moveWidget(widgets, 'pantry', -1)
    expect(reordered.slice(0, 2).map(widget => widget.id)).toEqual(['pantry', 'today'])
    expect(widgets.map(widget => widget.id)).toEqual(widgetIds)
  })
})
