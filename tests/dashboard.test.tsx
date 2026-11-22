// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/main'
import { dayKey, offsetDay, seed, storageKey } from '../src/data'
import { preferencesKey } from '../src/dashboard-preferences'

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
  act(() => {
    field.value = value
    field.dispatchEvent(new Event('change', { bubbles: true }))
  })
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
    const next = JSON.parse(localStorage.getItem(storageKey)!)
    expect(next).toEqual({
      ...saved,
      chores: [{ ...saved.chores[0], date: offsetDay(today, 7), lastDone: today }, ...saved.chores.slice(1)],
    })
    expect(target.querySelector('[aria-label="Chores complete: 2 of 3"]')).not.toBeNull()
    expect(button('Wash guest towels completed').getAttribute('aria-disabled')).toBe('true')
    unmount()
    mount()
    expect(button('Wash guest towels completed')).toBeTruthy()
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(next))
  })

  it('reorders, hides and styles widgets across reloads while keeping access to their pages', () => {
    click('Customize')
    click('Move Pantry up')
    const shopping = target.querySelector<HTMLInputElement>('input[aria-label="Show Shopping"]')!
    act(() => shopping.click())
    click('Categories')
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
    expect(widgetOrder()[0]).toBe('widget-today')

    click('Customize')
    for (const input of target.querySelectorAll<HTMLInputElement>('dialog input[type="checkbox"]')) {
      act(() => input.click())
    }
    click('Save dashboard')
    expect(widgetOrder()).toEqual([])
    click('Show widgets')
    click('Reset')
    click('Save dashboard')
    expect(widgetOrder()).toHaveLength(7)
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(saved))
  })
})
