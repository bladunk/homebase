// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/main'
import { dayKey, offsetDay, seed, storageKey } from '../src/data'
import { preferencesKey } from '../src/dashboard-preferences'
import { v4Key, type Snapshot } from '../src/storage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let target: HTMLElement
let today: string
let saved: ReturnType<typeof seed>

function mount() {
  target = document.createElement('div')
  document.body.append(target)
  root = createRoot(target)
  act(() => root?.render(<App />))
}

function unmount() {
  act(() => root?.unmount())
  target?.remove()
  root = undefined
}

function button(name: string) {
  const match = [...target.querySelectorAll<HTMLButtonElement>('button')].find(node =>
    (node.getAttribute('aria-label') ?? node.textContent?.trim()) === name)
  if (!match) throw new Error('Missing button ' + name)
  return match
}

function click(name: string) {
  act(() => button(name).click())
}

function choose(label: string, value: string) {
  const field = target.querySelector<HTMLSelectElement>('select[aria-label="' + label + '"]')!
  select(field, value)
}

function select(field: HTMLSelectElement, value: string) {
  act(() => {
    field.value = value
    field.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function v4(): Snapshot {
  return JSON.parse(localStorage.getItem(v4Key)!)
}

function widgetOrder() {
  return [...target.querySelectorAll('.command-grid section')].map(section => section.getAttribute('aria-labelledby'))
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () { this.open = true }
    HTMLDialogElement.prototype.close = function () { this.open = false }
  }
  today = dayKey()
  saved = seed()
  saved.chores[0].name = 'Wash guest towels'
  saved.chores[3].date = offsetDay(today, -1)
  saved.chores[1].lastDone = today
  localStorage.setItem(storageKey, JSON.stringify(saved))
  mount()
})

afterEach(() => {
  unmount()
  vi.restoreAllMocks()
})

describe('command center with existing records', () => {
  it('shows actual due, overdue, and completed chores and advances recurring tasks on one tap', () => {
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))
    expect(target.querySelector('#widget-today')?.textContent).toBe('Today’s chores')
    expect(button('Edit Dishes').textContent).toContain('Overdue')
    expect(button('Change bedsheets completed').getAttribute('aria-disabled')).toBe('true')
    expect(target.querySelector('[aria-label="Chores complete: 1 of 3"]')).not.toBeNull()
    click('Complete Wash guest towels')
    const next = v4().data
    expect(next.chores[0]).toMatchObject({ ...saved.chores[0], date: offsetDay(today, 7), lastDone: today,
      history: [{ action: 'complete', day: today }] })
    expect(next.chores.slice(1)).toEqual(saved.chores.slice(1))
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))
    expect(target.querySelector('[aria-label="Chores complete: 2 of 3"]')).not.toBeNull()
    expect(button('Wash guest towels completed').getAttribute('aria-disabled')).toBe('true')
    unmount()
    mount()
    expect(button('Wash guest towels completed')).toBeTruthy()
    expect(v4().data).toEqual(next)
  })

  it('reorders, hides and styles widgets across reloads while keeping access to their pages', () => {
    click('Customize')
    click('Move Pantry up')
    const shopping = target.querySelector<HTMLInputElement>('input[aria-label="Show Shopping"]')!
    act(() => shopping.click())
    click('Style')
    choose('Pantry color', 'slate')
    choose('Pantry icon', 'coffee')
    click('Themes')
    const dusk = target.querySelector<HTMLInputElement>('input[value="dusk"]')!
    act(() => dusk.click())
    click('Save dashboard')
    expect(target.querySelector('.shell')?.getAttribute('data-theme')).toBe('dusk')
    expect(widgetOrder().slice(0, 2)).toEqual(['widget-pantry', 'widget-today'])
    expect(widgetOrder()).not.toContain('widget-shopping')
    expect(target.querySelector('#widget-pantry .category-icon')?.getAttribute('data-color')).toBe('slate')
    expect(target.querySelector('#widget-pantry svg.lucide-coffee')).not.toBeNull()
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))

    unmount()
    mount()
    expect(target.querySelector('.shell')?.getAttribute('data-theme')).toBe('dusk')
    expect(widgetOrder()[0]).toBe('widget-pantry')
    expect(widgetOrder()).not.toContain('widget-shopping')
    click('Shopping')
    expect(target.querySelector('main h1')?.textContent).toBe('Shopping')
    expect(target.textContent).toContain('Bananas')
  })

  it('discards unsaved changes and recovers an entirely hidden layout', () => {
    click('Customize')
    click('Move Pantry up')
    click('Cancel')
    expect(localStorage.getItem(preferencesKey)).toBeNull()
    expect(localStorage.getItem(v4Key)).toBeNull()
    expect(widgetOrder()[0]).toBe('widget-today')

    click('Customize')
    for (const input of target.querySelectorAll<HTMLInputElement>('dialog input[type="checkbox"]')) {
      act(() => input.click())
    }
    click('Save dashboard')
    expect(widgetOrder()).toEqual([])
    click('Show widgets')
    click('Reset layout')
    click('Save dashboard')
    expect(widgetOrder()).toHaveLength(7)
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))
  })

  it('adds a resized widget to a custom section and saves theme controls', () => {
    click('Customize')
    click('Sections')
    const name = target.querySelector<HTMLInputElement>('dialog form input')!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(name, 'Kitchen')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click('Add section')
    click('Layout')
    select(target.querySelector<HTMLSelectElement>('.widget-add select')!, 'expiry')
    click('Add')
    choose('Expiring pantry items width', 'full')
    const sections = target.querySelector<HTMLSelectElement>('select[aria-label="Expiring pantry items section"]')!
    select(sections, Array.from(sections.options).find(option => option.textContent === 'Kitchen')!.value)
    click('Remove Needs attention')
    click('Themes')
    const [layout, texture] = target.querySelectorAll<HTMLSelectElement>('.appearance-options select')
    select(layout, 'expanded')
    select(texture, 'grid')
    click('Save dashboard')
    unmount()
    mount()
    expect(target.querySelector('.dashboard-section[aria-label="Kitchen"] .widget-wide h2')?.textContent).toBe('Expiring pantry items')
    expect(target.querySelector('.command-layout')?.getAttribute('data-density')).toBe('expanded')
    expect(target.querySelector('.shell')?.getAttribute('data-texture')).toBe('grid')
    expect(widgetOrder()).not.toContain('widget-attention')
    expect(v4().data).toEqual(saved)
  })

  it('snoozes and undoes an occurrence through dashboard activity', () => {
    click('Activity for Wash guest towels')
    click('Snooze')
    expect(v4().data.chores[0].snoozedUntil).toBe(offsetDay(today, 1))
    expect(target.querySelector('#widget-today')?.closest('section')?.textContent).not.toContain('Wash guest towels')
    click('Chores')
    click('Activity for Wash guest towels')
    click('Undo last action')
    expect(v4().data.chores[0].snoozedUntil).toBeUndefined()
    expect(v4().data.chores[0].history?.[0].undone).toBe(true)
  })

  it('favorites pantry items, adjusts stock, and adds suggested products without duplicates', () => {
    click('Pantry')
    click('Favorite Oat milk')
    click('Increase Oat milk')
    expect(v4().data.pantry[0]).toMatchObject({ quantity: 2, favorite: true })
    click('Shopping')
    click('Add Coffee beans to list')
    expect(v4().data.groceries.filter(item => item.name === 'Coffee beans')).toHaveLength(1)
    expect(target.querySelector('[aria-label="Add Coffee beans to list"]')).toBeNull()
  })

  it('creates a reusable routine and shares completion with the chore schedule', () => {
    click('Routines')
    click('New routine')
    const form = target.querySelector<HTMLFormElement>('dialog form')!
    const name = form.elements.namedItem('name') as HTMLInputElement
    const [towels, , vacuum] = form.querySelectorAll<HTMLInputElement>('input[name="chore"]')
    act(() => { name.value = 'Sunday Reset'; towels.click(); vacuum.click(); form.requestSubmit() })
    expect(v4().data.routines?.[0].choreIds).toEqual(['c1', 'c3'])
    const [check] = target.querySelectorAll<HTMLInputElement>('.routine-progress input')
    act(() => check.click())
    expect(v4().data.chores[0].lastDone).toBe(today)
    expect(target.querySelector('.routine-progress')?.textContent).toContain('1/2 complete today')
    unmount()
    mount()
    click('Routines')
    expect(target.querySelector('.routine-progress')?.textContent).toContain('1/2 complete today')
  })

  it('creates an activity category and renders an assigned pantry item in its widget', () => {
    click('Categories')
    click('Add category')
    const categoryForm = target.querySelector<HTMLFormElement>('dialog form')!
    act(() => {
      (categoryForm.elements.namedItem('name') as HTMLInputElement).value = 'Kitchen'
      categoryForm.requestSubmit()
    })
    const category = v4().data.categories![0]
    click('Pantry')
    click('Edit Oat milk')
    const productForm = target.querySelector<HTMLFormElement>('dialog form')!
    act(() => {
      (productForm.elements.namedItem('categoryId') as HTMLSelectElement).value = category.id
      productForm.requestSubmit()
    })
    expect(v4().data.pantry[0].categoryId).toBe(category.id)
    click('Overview')
    click('Customize')
    select(target.querySelector<HTMLSelectElement>('.widget-add select')!, 'activity')
    click('Add')
    click('Style')
    const activityOption = [...target.querySelectorAll<HTMLSelectElement>('dialog select')].find(field =>
      field.parentElement?.textContent?.startsWith('Activity category'))!
    select(activityOption, category.id)
    choose('Kitchen display', 'list')
    click('Save dashboard')
    unmount()
    mount()
    expect(target.querySelector('.command-grid .widget-list')?.textContent).toContain('Oat milk')
    expect(v4().dashboard.widgets.find(widget => widget.kind === 'activity')?.categoryId).toBe(category.id)
  })

  it('validates a legacy import and keeps the current dashboard customization on restore', async () => {
    click('Customize')
    click('Remove Calendar')
    click('Save dashboard')
    const layout = v4().dashboard
    click('Backup & restore')
    const input = target.querySelector<HTMLInputElement>('input[type="file"]')!
    const importFile = async (text: string) => {
      Object.defineProperty(input, 'files', { value: [{ text: async () => text }], configurable: true })
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
    }
    await importFile('{"version":3}')
    expect(target.querySelector('dialog')).toBeNull()
    expect(v4().data).toEqual(saved)
    const replacement = { ...saved, pantry: [] }
    await importFile(JSON.stringify(replacement))
    expect(v4().data).toEqual(saved)
    click('Restore backup')
    expect(v4()).toMatchObject({ version: 4, data: replacement, dashboard: layout })
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))
  })
})
