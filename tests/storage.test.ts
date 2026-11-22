import { expect, it } from 'vitest'
import { seed, storageKey } from '../src/data'
import { defaultPreferences, preferencesKey } from '../src/dashboard-preferences'
import { loadSnapshot, readBackup, v3Key, type Snapshot } from '../src/storage'

it('reads V1 records and V2 preferences without rewriting existing keys', () => {
  const data = seed()
  const oldPreferences = { theme: 'grove', widgets: [{ id: 'shopping', visible: false, color: 'slate', icon: 'heart' }] }
  const disk = new Map([[storageKey, JSON.stringify(data)], [preferencesKey, JSON.stringify(oldPreferences)]])
  const storage = { getItem: (key: string) => disk.get(key) ?? null }
  const { snapshot, error, empty } = loadSnapshot(storage)
  expect(error).toBe('')
  expect(empty).toBe(false)
  expect(snapshot.data).toEqual(data)
  expect(snapshot.dashboard.theme).toBe('grove')
  expect(snapshot.dashboard.widgets[0]).toMatchObject({ id: 'shopping', visible: false, color: 'slate', icon: 'heart' })
  expect(disk.size).toBe(2)
  expect(disk.get(storageKey)).toBe(JSON.stringify(data))
  expect(disk.get(preferencesKey)).toBe(JSON.stringify(oldPreferences))
})

it('round-trips V3 data and defaults to the current layout for old imports', () => {
  const data = seed()
  data.categories = [{ id: 'kitchen', name: 'Kitchen', icon: 'coffee', color: 'brass' }]
  data.chores[0].categoryId = 'kitchen'
  data.chores[0].rule = { mode: 'weekdays', weekdays: [0, 2] }
  data.routines = [{ id: 'routine', name: 'Kitchen reset', choreIds: [data.chores[0].id], categoryId: 'kitchen' }]
  data.pantry[0].expires = '2026-12-01'
  data.pantry[0].favorite = true
  const dashboard = { ...defaultPreferences(), theme: 'grove' as const, widgets: [] }
  const snapshot: Snapshot = { version: 3, data, dashboard }
  expect(readBackup(JSON.stringify(snapshot), defaultPreferences())).toEqual(snapshot)
  expect(readBackup(JSON.stringify(seed()), dashboard).dashboard).toEqual(dashboard)
})

it('rejects malformed backups, broken references, and corrupt V3 storage', () => {
  const data = seed()
  const dashboard = defaultPreferences()
  data.routines = [{ id: 'routine', name: 'Kitchen reset', choreIds: ['missing'] }]
  expect(() => readBackup(JSON.stringify({ version: 3, data, dashboard }), dashboard)).toThrow('routines')
  expect(() => readBackup(JSON.stringify({ version: 3, data: seed() }), dashboard)).toThrow('dashboard')
  const invalidLayout = { ...dashboard, sections: [] }
  expect(() => readBackup(JSON.stringify({ version: 3, data: seed(), dashboard: invalidLayout }), dashboard)).toThrow('dashboard')
  const disk = new Map([[v3Key, '{broken'], [storageKey, JSON.stringify(seed())]])
  const result = loadSnapshot({ getItem: key => disk.get(key) ?? null })
  expect(result.error).toContain('could not read')
  expect(disk.get(v3Key)).toBe('{broken')
})
