// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../src/main'
import { defaultPreferences } from '../src/dashboard-preferences'
import { seed } from '../src/data'
import { v3Key, v4Key, type Snapshot } from '../src/storage'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
let host: HTMLDivElement
const snapshot = (): Snapshot => JSON.parse(localStorage.getItem(v4Key)!)
function mount() {
  host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  act(() => root?.render(<App />))
}

function click(label: string | RegExp) {
  const node = [...host.querySelectorAll('button')].find(button => {
    const name = button.getAttribute('aria-label') || button.textContent?.trim() || ''
    return typeof label === 'string' ? name === label : label.test(name)
  })
  if (!node) throw new Error('Missing ' + label)
  act(() => node.click())
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host?.remove()
  vi.restoreAllMocks()
})

function answerWizard() {
  click('Continue')
  click('Continue')
  click('Preview chores')
}
it('guides an empty installation through review and imports only checked tasks', () => {
  mount()
  expect(snapshot().data.chores).toEqual([])
  click('Start setup')
  answerWizard()
  const unchecked = [...host.querySelectorAll('.suggestion-toggle')].find(label => label.textContent?.includes('Wash dishes'))!
  act(() => unchecked.querySelector('input')?.click())
  click(/^Import \d+ chores$/)
  expect(snapshot().data.chores.length).toBeGreaterThan(5)
  expect(snapshot().data.chores.some(task => task.plan?.templateId === 'dishes')).toBe(false)
  expect(snapshot().smart.answers).toMatchObject({ home: 'apartment' })
  expect(host.querySelector('h1')?.textContent).toBe('Chores')
  click('Undo last import')
  expect(snapshot().data.chores).toEqual([])
})

it('keeps installed V3 records and preferences intact when existing users run setup', () => {
  const data = seed()
  const dashboard = { ...defaultPreferences(), theme: 'grove' }
  const installed = JSON.stringify({ version: 3, data, dashboard })
  localStorage.setItem(v3Key, installed)
  mount()
  expect(localStorage.getItem(v4Key)).toBeNull()
  click('Guided setup')
  answerWizard()
  expect(host.textContent).toContain('existing matches will be kept')
  click(/^Import \d+ chores$/)
  expect(snapshot().data.chores.slice(0, data.chores.length)).toEqual(data.chores)
  expect(snapshot().dashboard).toEqual(dashboard)
  expect(localStorage.getItem(v3Key)).toBe(installed)
  click('Undo last import')
  expect(snapshot().data).toEqual(data)
})

it('opens Today and enables personal progress independently of chore data', () => {
  const data = seed()
  localStorage.setItem(v3Key, JSON.stringify({ version: 3, data, dashboard: defaultPreferences() }))
  mount()
  click('Today')
  expect(host.textContent).toContain('Suggested week')
  click('Complete Laundry')
  click('Progress')
  expect(host.textContent).not.toContain('Home Score')
  click('Turn on progress')
  expect(snapshot().smart.progress.enabled).toBe(true)
  expect(host.textContent).toContain('Home Score')
  expect(host.textContent).toContain('10 XP')
  expect(snapshot().data.chores.find(task => task.id === 'c1')?.history).toHaveLength(1)
})
