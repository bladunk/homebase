import { describe, expect, it } from 'vitest'
import { choreCategories, choreLibrary, references, templateById } from '../src/chore-library'
import { seed, type Schedule } from '../src/data'
import { applyTaskAction, dueDate, isActive } from '../src/recurrence'
import { defaultAnswers, defaultPlanner, draftRecord, importSuggestions, isDuplicate, onDemand, starterSuggestions, undoImport, type Suggestion } from '../src/smart-plan'

const today = '2026-11-23'

function suggestion(id: string): Suggestion {
  const template = templateById(id)!
  return { template, minutes: template.minutes, cadence: template.cadence, firstDue: today, enabled: true }
}

describe('chore library and smart setup', () => {
  it('covers ten distinct categories with useful structured templates and primary references', () => {
    expect(choreLibrary.length).toBeGreaterThanOrEqual(100)
    expect(new Set(choreLibrary.map(template => template.id)).size).toBe(choreLibrary.length)
    expect(choreCategories.every(category => choreLibrary.filter(template => template.category === category).length >= 10)).toBe(true)
    for (const template of choreLibrary) {
      expect(template.minutes).toBeGreaterThan(0)
      expect(template.instructions.length).toBeGreaterThan(15)
      expect(template.references.every(item => references[item.id].url.startsWith('https://'))).toBe(true)
    }
    expect(templateById('baby-bottles')?.references).toContainEqual(expect.objectContaining({ id: 'cdcBaby', supports: 'cadence' }))
    expect(templateById('dishwasher-filter')?.references).toContainEqual(expect.objectContaining({ id: 'whirlpoolDish', supports: 'method' }))
  })

  it('filters by household and models equipment and room count', () => {
    const defaults = defaultAnswers()
    const base = starterSuggestions(defaults, defaultPlanner(), [], today)
    expect(base.some(row => row.template.id === 'litter' || row.template.id === 'baby-bottles' || row.template.id === 'vacuum')).toBe(false)
    const answers = { ...defaults, bedrooms: 0, bathrooms: 2, kit: ['cat', 'baby', 'bottles', 'carpet', 'keurig'] as const }
    const next = starterSuggestions({ ...answers, kit: [...answers.kit] }, defaultPlanner(), [], today)
    expect(next.some(row => row.template.category === 'Bedrooms')).toBe(false)
    expect(next.find(row => row.template.id === 'toilet')?.minutes).toBe(16)
    expect(next.find(row => row.template.id === 'litter')).toMatchObject({ enabled: true, firstDue: today })
    expect(next.find(row => row.template.id === 'baby-bottles')).toMatchObject({ enabled: true, cadence: 'afterUse' })
    expect(next.some(row => row.template.id === 'vacuum')).toBe(true)
    expect(next.some(row => row.template.id === 'coffee-clean')).toBe(true)
  })

  it('places flexible starter work around preferred and resting days and limits daily defaults', () => {
    const plan = { ...defaultPlanner(), budget: 12, style: 'weekend' as const, restDays: [6] }
    const rows = starterSuggestions(defaultAnswers(), plan, [], today)
    const weekly = rows.find(row => row.template.id === 'kitchen-sink')!
    expect(weekly.firstDue).not.toBe('2026-11-28')
    expect(rows.filter(row => row.enabled && row.cadence === 'daily').reduce((sum, row) => sum + row.minutes, 0)).toBeLessThanOrEqual(12)
    expect(rows.find(row => row.template.id === 'smoke-test')?.firstDue).toBe(today)
  })

  it('deduplicates aliases, retries, renamed imports, and matches across scheduled collections', () => {
    const original = seed()
    const first = importSuggestions([suggestion('laundry'), suggestion('dishwasher-filter'), suggestion('toilet'), suggestion('toilet')], original, () => 'id')
    expect(first.records).toHaveLength(1)
    expect(first.records[0].plan?.templateId).toBe('toilet')
    expect(first.data.chores.slice(0, original.chores.length)).toEqual(original.chores)
    const renamed: Schedule = { ...first.records[0], name: 'Downstairs loo' }
    expect(isDuplicate(templateById('toilet')!, [renamed])).toBe(true)
    expect(importSuggestions([suggestion('toilet')], first.data, () => 'unused').records).toEqual([])
  })

  it('undoes only untouched imported tasks and keeps routines and existing rows', () => {
    const original = seed()
    let id = 0
    const first = importSuggestions(['toilet', 'toothbrush-holder', 'bath-mirror'].map(suggestion), original, () => 'import-' + id++)
    const [untouched, edited, referenced] = first.records
    const modified = { ...first.data, chores: first.data.chores.map(row => row.id === edited.id ? { ...row, notes: 'My instructions' } : row),
      routines: [{ id: 'r', name: 'Reset', choreIds: [referenced.id] }] }
    const undo = undoImport(modified, first.records)
    expect(undo.removed).toBe(1)
    expect(undo.data.chores.find(row => row.id === untouched.id)).toBeUndefined()
    expect(undo.data.chores.find(row => row.id === edited.id)?.notes).toBe('My instructions')
    expect(undo.data.routines).toEqual(modified.routines)
    expect(undo.data.chores.slice(0, original.chores.length)).toEqual(original.chores)
  })

  it('tracks after-use chores repeatedly without snoozing or creating calendar reminders', () => {
    const record = draftRecord(suggestion('baby-bottles'), 'bottles')
    expect(onDemand(record)).toBe(true)
    expect(applyTaskAction(record, 'snooze', today, '2026-11-24')).toBe(record)
    expect(applyTaskAction(record, 'skip', today)).toBe(record)
    const first = applyTaskAction(record, 'complete', today)
    const second = applyTaskAction(first, 'complete', today)
    expect(dueDate(second)).toBe(today)
    expect(second.history).toHaveLength(2)
    expect(isActive(second)).toBe(true)
  })
})
