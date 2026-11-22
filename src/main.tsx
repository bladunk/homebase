import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CalendarDays, ClipboardList, ChevronLeft, ChevronRight, Download, House, Ellipsis, PackageOpen, PawPrint, Pencil, Plus, ShoppingBasket, Sparkles, Tag, Trash2, Upload, Wrench, X } from 'lucide-react'
import { collections, dayKey, formatDay, isDate, offsetDay, scheduled, type Category, type Collection, type Event, type Grocery, type Pantry, type RecordItem, type Routine, type Schedule, type ScheduledCollection, type State } from './data'
import { CategoryIcon, Dashboard } from './dashboard'
import { CustomizeDashboard } from './customizer'
import { defaultWidget, themeOptions, type DashboardPreferences } from './dashboard-preferences'
import { CategoryEditor, CategorySelect, CategoryTag, InventoryRow, RoutineEditor, RoutineProgress, TaskActivity, TaskCheck } from './household-tools'
import { isLowStock, suggestedItems } from './inventory'
import { applyTaskAction, dueDate, isActive, recurrenceLabels, ruleDescription, taskRule, undoTask, type RecurrenceMode, type Rule, type TaskAction } from './recurrence'
import { inaccessibleSnapshot, loadSnapshot, readBackup, v3Key, type Snapshot } from './storage'
import './style.css'
import './command-center.css'
import './v3.css'

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: House },
  { id: 'chores', label: 'Chores', widget: 'today' },
  { id: 'pantry', label: 'Pantry', widget: 'pantry' },
  { id: 'shopping', label: 'Shopping', widget: 'shopping' },
  { id: 'dog', label: 'Dog care', widget: 'dog' },
  { id: 'calendar', label: 'Calendar', widget: 'calendar' },
  { id: 'maintenance', label: 'Maintenance', widget: 'maintenance' },
  { id: 'routines', label: 'Routines', widget: 'routines' },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'backup', label: 'Backup & restore', icon: Download },
] as const
type Page = typeof navigation[number]['id']
const recordNames: Record<Collection, string> = {
  chores: 'chore', pantry: 'pantry item', lists: 'shopping list', groceries: 'shopping item',
  medication: 'medication', vet: 'vet visit', calendar: 'event', maintenance: 'maintenance task',
}
type Editor = { collection: Collection; item?: RecordItem; listId?: string; date?: string }
const bottomNavigation = [
  { id: 'dashboard', label: 'Home', icon: House },
  { id: 'chores', label: 'Chores', icon: ClipboardList },
  { id: 'pantry', label: 'Pantry', icon: PackageOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
] as const
const subtitles: Record<Page, string> = {
  dashboard: '', chores: 'Keep the everyday work on a schedule.', pantry: 'Track what you have and see what’s running low.',
  shopping: 'Keep separate lists for each kind of shopping trip.', dog: 'Keep medication schedules and vet visits in one place.',
  calendar: 'See household events and scheduled tasks together.', maintenance: 'Keep track of appliance care and service dates.',
  routines: 'Reuse groups of chores and track what’s done today.', categories: 'Organize household records by activity.',
  backup: 'Download a copy of your household data or import a backup.',
}

export function App() {
  const [initial] = useState(() => {
    try { return loadSnapshot(window.localStorage) }
    catch { return inaccessibleSnapshot() }
  })
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const snapshotRef = useRef(snapshot)
  const { data: state, dashboard: preferences } = snapshot
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(initial.error)
  const readError = useRef(initial.error)
  const categories = state.categories ?? []
  const routines = state.routines ?? []
  const [customizing, setCustomizing] = useState(false)
  const [preferenceError, setPreferenceError] = useState('')
  const [page, setPage] = useState<Page>('dashboard')
  const [menu, setMenu] = useState(false)
  const [editor, setEditor] = useState<Editor>()
  const [pendingRestore, setPendingRestore] = useState<Snapshot>()
  const [taskPanel, setTaskPanel] = useState<{ collection: ScheduledCollection; id: string }>()
  const [routineEditor, setRoutineEditor] = useState<Routine | 'new'>()
  const [categoryEditor, setCategoryEditor] = useState<Category | 'new'>()
  const [pantryFilter, setPantryFilter] = useState('all')
  const [suggestionList, setSuggestionList] = useState('')
  const [today, setToday] = useState(dayKey)
  const [selectedDay, setSelectedDay] = useState(dayKey)
  const [month, setMonth] = useState(() => dayKey().slice(0, 7))
  const fileInput = useRef<HTMLInputElement>(null)
  const main = useRef<HTMLElement>(null)
  const moreButton = useRef<HTMLButtonElement>(null)
  const morePanel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!menu) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenu(false)
        moreButton.current?.focus()
      }
    }
    const links = [...(morePanel.current?.querySelectorAll<HTMLButtonElement>('button:not([data-mobile-primary])') ?? [])]
    if (links[0]?.getClientRects().length) links[0].focus()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menu])
  useEffect(() => {
    const update = () => setToday(dayKey())
    const timer = window.setInterval(update, 30000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  useEffect(() => {
    try {
      if (initial.empty && localStorage.getItem(v3Key) === null) localStorage.setItem(v3Key, JSON.stringify(initial.snapshot))
    } catch {
      setStorageError('This browser could not save HomeBase data.')
    }
    const synchronize = (event: StorageEvent) => {
      if (event.key !== v3Key && event.key !== null) return
      const loaded = loadSnapshot(window.localStorage)
      readError.current = loaded.error
      setStorageError(loaded.error)
      if (!loaded.error) {
        snapshotRef.current = loaded.snapshot
        setSnapshot(loaded.snapshot)
      }
    }
    window.addEventListener('storage', synchronize)
    return () => window.removeEventListener('storage', synchronize)
  }, [initial])

  function writeSnapshot(next: Snapshot, message: string, restoring = false) {
    if (readError.current && !restoring) return false
    try {
      localStorage.setItem(v3Key, JSON.stringify(next))
      snapshotRef.current = next
      setSnapshot(next)
      readError.current = ''
      setStorageError('')
      setNotice(message)
      return true
    } catch {
      setStorageError('HomeBase could not save this change. Check device storage or browser settings and try again.')
      return false
    }
  }

  function persist(data: State, message: string) {
    return writeSnapshot({ ...snapshotRef.current, data }, message)
  }

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeOptions[preferences.theme].swatches[0])
  }, [preferences.theme])

  function savePreferences(next: DashboardPreferences) {
    if (writeSnapshot({ ...snapshotRef.current, dashboard: next }, 'Dashboard saved.')) closeCustomizer()
    else setPreferenceError('Dashboard preferences could not be saved. Check device storage or restore a valid backup.')
  }

  function closeCustomizer() {
    setCustomizing(false)
    setPreferenceError('')
  }

  function go(target: Page) {
    setPage(target)
    setMenu(false)
    setNotice('')
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }

  function save(collection: Collection, item: RecordItem, message = 'Changes saved.') {
    const data = snapshotRef.current.data
    const rows: RecordItem[] = data[collection]
    const next = rows.some(row => row.id === item.id) ? rows.map(row => row.id === item.id ? item : row) : [...rows, item]
    return persist({ ...data, [collection]: next }, message)
  }

  function remove(collection: Collection, item: RecordItem) {
    const label = collection === 'lists' ? item.name + ' and all its items' : item.name
    if (!window.confirm('Delete ' + label + '?')) return false
    const next = { ...state, [collection]: state[collection].filter(row => row.id !== item.id) }
    if (collection === 'lists') next.groceries = state.groceries.filter(row => row.listId !== item.id)
    if (collection === 'chores' && next.routines) {
      next.routines = next.routines.map(routine => ({ ...routine, choreIds: routine.choreIds.filter(id => id !== item.id),
        checkoffs: routine.checkoffs && Object.fromEntries(Object.entries(routine.checkoffs).filter(([id]) => id !== item.id)) }))
    }
    return persist(next, 'Deleted.')
  }

  function saveCategory(category: Category) {
    const next = categories.some(row => row.id === category.id) ? categories.map(row => row.id === category.id ? category : row) : [...categories, category]
    if (persist({ ...state, categories: next }, 'Category saved.')) setCategoryEditor(undefined)
  }

  function removeCategory(category: Category) {
    if (!window.confirm('Delete ' + category.name + ' and unassign its records?')) return
    const unassign = <T extends { categoryId?: string },>(rows: T[]) =>
      rows.map(row => row.categoryId === category.id ? { ...row, categoryId: undefined } : row)
    const data = { ...state, ...Object.fromEntries(collections.map(key => [key, unassign(state[key] as RecordItem[])])),
      categories: categories.filter(row => row.id !== category.id), routines: unassign(routines) }
    const dashboard = { ...preferences, widgets: unassign(preferences.widgets) }
    if (writeSnapshot({ version: 3, data, dashboard }, 'Category deleted.')) {
      setCategoryEditor(undefined)
      setPantryFilter('all')
    }
  }

  function saveRoutine(routine: Routine) {
    const next = routines.some(row => row.id === routine.id) ? routines.map(row => row.id === routine.id ? routine : row) : [...routines, routine]
    if (persist({ ...state, routines: next }, 'Routine saved.')) setRoutineEditor(undefined)
  }

  function removeRoutine(routine: Routine) {
    if (window.confirm('Delete ' + routine.name + '?') &&
      persist({ ...state, routines: routines.filter(row => row.id !== routine.id) }, 'Routine deleted.')) setRoutineEditor(undefined)
  }

  const categoryFor = (item: { categoryId?: string }) => categories.find(category => category.id === item.categoryId)
  const tasks = scheduled.flatMap(collection => state[collection].filter(isActive).map(task => ({ collection, task })))
  const due = tasks.filter(({ task }) => dueDate(task) <= today).sort((a, b) => dueDate(a.task).localeCompare(dueDate(b.task)))
  const low = state.pantry.filter(isLowStock)
  const suggestions = suggestedItems(state.pantry, state.groceries)
  const filteredPantry = state.pantry.filter(item => pantryFilter === 'all' || (pantryFilter === 'favorites' ? item.favorite :
    pantryFilter === 'uncategorized' ? !item.categoryId : item.categoryId === pantryFilter)).sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite))
  const dated = [
    ...tasks.map(({ collection, task }) => ({ collection, item: task, date: dueDate(task), time: '' })),
    ...state.calendar.map(item => ({ collection: 'calendar' as const, item, date: item.date, time: item.time })),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const upcoming = dated.filter(entry => entry.date > today || (entry.date === today && entry.collection === 'calendar'))
  const activePanel = taskPanel && state[taskPanel.collection].find(row => row.id === taskPanel.id)

  function actOnTask(collection: ScheduledCollection, task: Schedule, action: TaskAction | 'undo', until?: string) {
    const current = snapshotRef.current.data[collection].find(row => row.id === task.id)
    if (current !== task) return false
    const next = action === 'undo' ? undoTask(task) : applyTaskAction(task, action, today, until)
    if (task === next) return false
    const message = action === 'complete'
      ? task.name + (isActive(next) ? ' done. Next date scheduled.' : ' done.')
      : action === 'skip' ? 'Occurrence skipped.' : action === 'undo' ? 'Last action undone.' : 'Task snoozed.'
    return save(collection, next, message)
  }

  function completeRoutineStep(routine: Routine, task: Schedule) {
    if (isActive(task)) { complete('chores', task); return }
    if (routine.checkoffs?.[task.id] === today) return
    const next = routines.map(row => row.id === routine.id
      ? { ...row, checkoffs: { ...row.checkoffs, [task.id]: today } }
      : row)
    persist({ ...state, routines: next }, task.name + ' done for this routine.')
  }

  function complete(collection: ScheduledCollection, task: Schedule) {
    return actOnTask(collection, task, 'complete')
  }

  const first = new Date(month + '-01T12:00:00')
  const leading = (first.getDay() + 6) % 7
  const monthSize = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()

  function scheduleRows(collection: typeof scheduled[number]) {
    return [...state[collection]].sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || dueDate(a).localeCompare(dueDate(b))).map(task =>
      <TaskRow key={task.id} task={task} today={today} edit={() => setEditor({ collection, item: task })}
        done={() => complete(collection, task)} category={categoryFor(task)} activity={() => setTaskPanel({ collection, id: task.id })} />)
  }

  function addToShopping(item: Pantry, listId?: string) {
    if (!state.lists.length) { setEditor({ collection: 'lists' }); setNotice('Create a shopping list first.'); return }
    const list = state.lists.find(row => row.id === listId) ?? state.lists[0]
    if (state.groceries.some(row => row.listId === list.id && !row.done && row.name.trim().toLocaleLowerCase() === item.name.trim().toLocaleLowerCase())) {
      setNotice(item.name + ' is already on ' + list.name + '.')
      return
    }
    save('groceries', { id: crypto.randomUUID(), name: item.name, listId: list.id, done: false, categoryId: item.categoryId }, 'Added to ' + list.name + '.')
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'homebase-' + today + '.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
    setNotice('Backup downloaded.')
  }

  return <div className="shell" data-theme={preferences.theme} data-texture={preferences.texture}>
    <a className="skip" href="#content">Skip to content</a>
    <aside className={'sidebar ' + (menu ? 'expanded' : '')}>
      <div className="brand-bar">
        <button className="brand" onClick={() => go('dashboard')}><span className="brand-icon"><House size={22} /></span><span>HomeBase</span></button>

      </div>
      <nav id="navigation" ref={morePanel} aria-label="Main navigation">{navigation.map(item => {
        const category = 'widget' in item ? preferences.widgets.find(widget => widget.kind === item.widget) ?? defaultWidget(item.widget) : undefined
        const Icon = 'icon' in item ? item.icon : House
        return <button key={item.id} data-mobile-primary={bottomNavigation.some(entry => entry.id === item.id) || undefined} aria-current={page === item.id ? 'page' : undefined} onClick={() => go(item.id)}>
          {category ? <CategoryIcon widget={category} /> : <Icon size={19} aria-hidden="true" />}{item.label}
        </button>
      })}</nav>
      <div className="sidebar-foot"><span className="status-dot" /> Stored on this device</div>
    </aside>
    <main id="content" className={page === 'dashboard' ? 'command-main' : undefined} ref={main} tabIndex={-1}>
      {page !== 'dashboard' && <div className="topline"><span>{navigation.find(item => item.id === page)?.label}</span><span><CalendarDays size={16} />{formatDay(today, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>}
      {storageError && <p className="message error" role="alert">{storageError}</p>}
      <div aria-live="polite">{notice && <div className={'message flex items-center justify-between gap-3' + (page === 'dashboard' ? ' command-notice' : '')}>{notice}<button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={17} /></button></div>}</div>
      {page !== 'dashboard' && <header className="page-head"><h1>{navigation.find(item => item.id === page)?.label}</h1><p>{subtitles[page]}</p></header>}
      {page === 'dashboard' && <Dashboard state={state} today={today} preferences={preferences} due={due} upcoming={upcoming}
        go={go} edit={(collection, item) => setEditor({ collection, item })} complete={complete}
        activity={(collection, task) => setTaskPanel({ collection, id: task.id })} addChore={() => setEditor({ collection: 'chores' })} customize={() => setCustomizing(true)} />}
      {page === 'routines' && <>
        <div className="section-action"><Add onClick={() => setRoutineEditor('new')}>New routine</Add></div>
        <div className="dashboard-grid">{routines.map(routine =>
          <Panel key={routine.id} heading={routine.name} icon={<Sparkles />} action={<EditButton name={routine.name} action={() => setRoutineEditor(routine)} />}>
            <div className="routine-body"><CategoryTag category={categoryFor(routine)} />
              <RoutineProgress routine={routine} chores={state.chores} today={today} complete={task => completeRoutineStep(routine, task)} />
            </div>
          </Panel>)}</div>
        {!routines.length && <Panel heading="Routines" icon={<Sparkles />}><Empty>Create a routine by choosing chores you do together.</Empty></Panel>}
      </>}
      {page === 'categories' && <Panel heading="Activity categories" icon={<Tag />} action={<Add onClick={() => setCategoryEditor('new')}>Add category</Add>}>
        {categories.length ? categories.map(category => <div key={category.id} className="record-row">
          <div className="record-info"><CategoryTag category={category} /></div><EditButton name={category.name} action={() => setCategoryEditor(category)} />
        </div>) : <Empty>Add a category to group chores, pantry items, and other household records.</Empty>}
      </Panel>}
      {page === 'chores' && <Panel heading="Chore schedule" icon={<ClipboardList />} action={<Add onClick={() => setEditor({ collection: 'chores' })}>Add chore</Add>}>{state.chores.length ? scheduleRows('chores') : <Empty>Add a chore to start your schedule.</Empty>}</Panel>}
      {page === 'maintenance' && <Panel heading="Maintenance schedule" icon={<Wrench />} action={<Add onClick={() => setEditor({ collection: 'maintenance' })}>Add task</Add>}>{state.maintenance.length ? scheduleRows('maintenance') : <Empty>No maintenance tasks scheduled.</Empty>}</Panel>}
      {page === 'dog' && <div className="dashboard-grid">
        <Panel heading="Medication" icon={<PawPrint />} action={<Add onClick={() => setEditor({ collection: 'medication' })}>Add medication</Add>}>{state.medication.length ? scheduleRows('medication') : <Empty>No medications recorded.</Empty>}</Panel>
        <Panel heading="Vet visits" icon={<CalendarDays />} action={<Add onClick={() => setEditor({ collection: 'vet' })}>Add visit</Add>}>{state.vet.length ? scheduleRows('vet') : <Empty>No vet visits recorded.</Empty>}</Panel>
      </div>}
      {page === 'pantry' && <>
        {!!low.length && <p className="message stock-alert" role="status"><PackageOpen size={19} />{low.length} {low.length === 1 ? 'item is' : 'items are'} at or below the low-stock threshold.</p>}
        <Panel heading="Inventory" icon={<PackageOpen />} action={<Add onClick={() => setEditor({ collection: 'pantry' })}>Add item</Add>}>
          <div className="inventory-filter"><label>Show <select value={pantryFilter} onChange={event => setPantryFilter(event.target.value)}>
            <option value="all">All products</option><option value="favorites">Favorites</option><option value="uncategorized">Uncategorized</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select></label></div>
          {filteredPantry.length ? filteredPantry.map(item => <InventoryRow key={item.id} item={item} today={today} category={categoryFor(item)}
            save={next => save('pantry', next)} edit={() => setEditor({ collection: 'pantry', item })} add={() => addToShopping(item)} />) :
            <Empty>{state.pantry.length ? 'No products in this view.' : 'Your pantry is empty.'}</Empty>}
        </Panel>
      </>}
      {page === 'shopping' && <>
        <div className="section-action"><Add onClick={() => setEditor({ collection: 'lists' })}>New list</Add></div>
        {!!suggestions.length && <div className="suggestions"><Panel heading="Suggested from pantry" icon={<PackageOpen />}>
          {state.lists.length > 1 && <div className="inventory-filter"><label>Add to <select value={state.lists.some(list => list.id === suggestionList) ? suggestionList : state.lists[0].id} onChange={event => setSuggestionList(event.target.value)}>
            {state.lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select></label></div>}
          {suggestions.map(item => <div key={item.id} className="record-row"><div className="record-info"><strong>{item.name}</strong><small>{item.quantity} on hand</small></div>
            <button className="secondary" aria-label={'Add ' + item.name + ' to list'} onClick={() => addToShopping(item, suggestionList)}><Plus size={16} /> Add</button>
          </div>)}
        </Panel></div>}
        <div className="dashboard-grid">{state.lists.map(list => {
          const items = state.groceries.filter(item => item.listId === list.id)
          return <Panel key={list.id} heading={list.name} icon={<ShoppingBasket />} action={<EditButton name={list.name} action={() => setEditor({ collection: 'lists', item: list })} />}>
            <div className="list-meta">{items.filter(item => item.done).length} of {items.length} checked</div>
            {items.map(item => <div className="record-row" key={item.id}>
              <label className={'grocery ' + (item.done ? 'checked' : '')}><input type="checkbox" checked={item.done} onChange={event => save('groceries', { ...item, done: event.target.checked })} />{item.name}</label>
              <CategoryTag category={categoryFor(item)} /><EditButton name={item.name} action={() => setEditor({ collection: 'groceries', item, listId: list.id })} />
            </div>)}
            <div className="list-add"><Add onClick={() => setEditor({ collection: 'groceries', listId: list.id })}>Add item</Add></div>
          </Panel>
        })}</div>
        {!state.lists.length && <Panel heading="Shopping lists" icon={<ShoppingBasket />}><Empty>Create a list to start adding items.</Empty></Panel>}
      </>}
      {page === 'calendar' && <div className="dashboard-grid calendar-layout">
        <Panel heading={formatDay(month + '-01', { month: 'long', year: 'numeric' })} icon={<CalendarDays />} action={<div className="row-actions">
          {[-1, 1].map(delta => <button key={delta} className="icon-button" aria-label={delta < 0 ? 'Previous month' : 'Next month'} onClick={() => {
            const nextMonth = dayKey(new Date(first.getFullYear(), first.getMonth() + delta, 1)).slice(0, 7)
            setMonth(nextMonth)
            setSelectedDay(nextMonth + '-01')
          }}>{delta < 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}</button>)}
        </div>}>
          <div className="month-grid">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
            {Array.from({ length: leading }, (_, index) => <span key={'blank' + index} />)}
            {Array.from({ length: monthSize }, (_, index) => {
              const date = offsetDay(month + '-01', index)
              const count = dated.filter(entry => entry.date === date).length
              return <button key={date} type="button" aria-label={formatDay(date, { dateStyle: 'full' }) + (count ? ', ' + count + ' scheduled' : '')} aria-pressed={selectedDay === date} aria-current={date === today ? 'date' : undefined} onClick={() => setSelectedDay(date)}>{index + 1}{!!count && <i />}</button>
            })}
          </div>
        </Panel>
        <Panel heading={formatDay(selectedDay, { weekday: 'short', month: 'short', day: 'numeric' })} icon={<ClipboardList />} action={<Add onClick={() => setEditor({ collection: 'calendar', date: selectedDay })}>Add event</Add>}>
          {dated.some(entry => entry.date === selectedDay) ? dated.filter(entry => entry.date === selectedDay).map(({ collection, time, item }) =>
            <div className="record-row" key={collection + item.id}><div className="record-info"><strong>{item.name}</strong><small>{time && new Date(selectedDay + 'T' + time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' · '}{recordNames[collection]}</small>{'notes' in item && item.notes && <small>{item.notes}</small>}</div><EditButton name={item.name} action={() => setEditor({ collection, item })} /></div>) : <Empty>Nothing scheduled for this day.</Empty>}
        </Panel>
      </div>}
      {page === 'backup' && <div className="dashboard-grid">
        <Panel heading="Export data" icon={<Download />}><div className="backup-body"><p>Save your household records and dashboard preferences as a JSON file.</p><button className="primary" onClick={download} disabled={!!readError.current}><Download size={18} /> Download backup</button></div></Panel>
        <Panel heading="Restore data" icon={<Upload />}><div className="backup-body"><p>Import a HomeBase backup. Review the file before replacing records on this device.</p>
          <input type="file" ref={fileInput} hidden accept=".json,application/json" onChange={async event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            try { setPendingRestore(readBackup(await file.text(), snapshotRef.current.dashboard)); setNotice('') }
            catch (error) { setNotice(error instanceof SyntaxError ? 'This file is not valid JSON.' : error instanceof Error ? error.message : 'Unable to read the backup.') }
          }} />
          <button className="secondary" onClick={() => fileInput.current?.click()}><Upload size={18} /> Choose backup</button></div></Panel>
      </div>}
      {page !== 'dashboard' && <footer>HomeBase · Your household planner</footer>}
    </main>
    {customizing && <Dialog heading="Customize dashboard" close={closeCustomizer} className="customizer-dialog">
      {preferenceError && <p className="message error" role="alert">{preferenceError}</p>}
      <CustomizeDashboard preferences={preferences} categories={categories} onSave={savePreferences} onClose={closeCustomizer} />
    </Dialog>}
    {editor && <RecordEditor key={editor.collection + (editor.item?.id || 'new')} editor={editor} today={today} categories={categories} close={() => setEditor(undefined)}
      save={item => {
        const saved = save(editor.collection, item)
        if (saved) setEditor(undefined)
        return saved
      }}
      remove={item => { if (remove(editor.collection, item)) setEditor(undefined) }} />}
    {categoryEditor && <Dialog heading={categoryEditor === 'new' ? 'Add category' : 'Edit category'} close={() => setCategoryEditor(undefined)}>
      <CategoryEditor category={categoryEditor === 'new' ? undefined : categoryEditor} save={saveCategory}
        remove={() => { if (categoryEditor !== 'new') removeCategory(categoryEditor) }} close={() => setCategoryEditor(undefined)} />
    </Dialog>}
    {routineEditor && <Dialog heading={routineEditor === 'new' ? 'New routine' : 'Edit routine'} close={() => setRoutineEditor(undefined)}>
      <RoutineEditor routine={routineEditor === 'new' ? undefined : routineEditor} chores={state.chores} categories={categories}
        save={saveRoutine} remove={() => { if (routineEditor !== 'new') removeRoutine(routineEditor) }} close={() => setRoutineEditor(undefined)} />
    </Dialog>}
    {taskPanel && activePanel && <Dialog heading={activePanel.name + ' activity'} close={() => setTaskPanel(undefined)}>
      <TaskActivity task={activePanel} today={today} action={(action, until) => {
        if (actOnTask(taskPanel.collection, activePanel, action, until)) setTaskPanel(undefined)
      }} undo={() => { if (actOnTask(taskPanel.collection, activePanel, 'undo')) setTaskPanel(undefined) }} />
    </Dialog>}
    {pendingRestore && <Dialog heading="Restore this backup?" close={() => setPendingRestore(undefined)}>
      <p>This replaces all HomeBase records on this device. A V3 backup also restores its dashboard preferences.</p>
      {storageError && <p className="message error" role="alert">{storageError}</p>}
      <div className="dialog-actions"><button className="secondary" onClick={() => setPendingRestore(undefined)}>Cancel</button><button className="primary" onClick={() => {
        if (writeSnapshot(pendingRestore, 'Backup restored.', true)) setPendingRestore(undefined)
      }}>Restore backup</button></div>
    </Dialog>}
    {menu && <button className="navigation-scrim" tabIndex={-1} aria-label="Close more navigation" onClick={() => {
      setMenu(false)
      moreButton.current?.focus()
    }} />}
    <nav className="mobile-navigation" aria-label="Mobile navigation">
      {bottomNavigation.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined}
        onClick={() => go(id)}><Icon size={21} />{label}</button>)}
      <button ref={moreButton} aria-current={!bottomNavigation.some(entry => entry.id === page) ? 'page' : undefined} aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)}><Ellipsis size={22} />More</button>
    </nav>
  </div>
}

function Panel({ heading, icon, action, children }: { heading: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><header><span className="panel-icon">{icon}</span><h2>{heading}</h2>{action && <div className="panel-action">{action}</div>}</header>{children}</section>
}

function Add({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="secondary" onClick={onClick}><Plus size={17} />{children}</button>
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

function EditButton({ name, action }: { name: string; action: () => void }) {
  return <button className="icon-button" title="Edit" aria-label={'Edit ' + name} onClick={action}><Pencil size={17} /></button>
}

function TaskRow({ task, today, edit, done, category, activity }: {
  task: Schedule; today: string; edit: () => void; done: () => void; category?: Category; activity: () => void
}) {
  const active = isActive(task)
  const date = dueDate(task)
  const status = active ? date < today ? 'Overdue' : date === today ? 'Today' :
    (task.snoozedUntil ? 'Snoozed to ' : '') + formatDay(date) : task.skipped ? 'Skipped' : 'Completed'
  return <div className="record-row schedule-row">
    <TaskCheck task={task} today={today} complete={done} />
    <div className="record-info"><strong>{task.name}</strong><small>{ruleDescription(task)}{task.lastDone && ' · Last done ' + formatDay(task.lastDone)}</small>
      {task.notes && <small>{task.notes}</small>}<CategoryTag category={category} />
      <span className={'pill ' + (active && date < today ? 'warning' : '')}>{status}</span>
    </div>
    <EditButton name={task.name} action={edit} />
    <button className="icon-button" aria-label={'Activity for ' + task.name} onClick={activity}><Ellipsis size={19} /></button>
  </div>
}

function Dialog({ heading, close, children, className }: { heading: string; close: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return <dialog ref={ref} className={className} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }}>
    <header><h2 id="dialog-title">{heading}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={21} /></button></header>
    {children}
  </dialog>
}

function RecordEditor({ editor, today, categories, close, save, remove }: { editor: Editor; today: string; categories: Category[]; close: () => void; save: (item: RecordItem) => boolean; remove: (item: RecordItem) => void }) {
  const { collection, item } = editor
  const isSchedule = scheduled.some(key => key === collection)
  const task = item as Schedule | undefined
  const pantry = item as Pantry | undefined
  const entry = item as Event | undefined
  const datedItem = item as (Event | Schedule) | undefined
  const initialRule = task ? taskRule(task) : { mode: collection === 'chores' ? 'weekly' as const : 'once' as const }
  const [mode, setMode] = useState<RecurrenceMode>(initialRule.mode)
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (key: string) => String(data.get(key) ?? '').trim()
    const name = read('name')
    if (!name) { setError('Enter a name.'); return }
    const base = { id: item?.id || crypto.randomUUID(), name, categoryId: read('categoryId') || undefined }
    const date = read('date')
    const notes = read('notes')
    if ((isSchedule || collection === 'calendar') && !isDate(date)) { setError('Enter a valid date.'); return }
    let record: RecordItem = base
    if (isSchedule) {
      const nextRule: Rule = { mode }
      const days = Number(read('interval'))
      if (mode === 'interval' || mode === 'completion') nextRule.days = days
      if (mode === 'monthly') nextRule.monthDay = Number(read('monthDay'))
      if (mode === 'weekdays') {
        nextRule.weekdays = data.getAll('weekday').map(Number)
        if (!nextRule.weekdays.length) { setError('Choose at least one weekday.'); return }
        const day = new Date(date + 'T12:00:00').getDay()
        if (!nextRule.weekdays.includes(day) && (task?.date !== date || JSON.stringify(task?.rule) !== JSON.stringify(nextRule))) {
          setError('Choose a first due date that matches one of the selected weekdays.')
          return
        }
      }
      const preserveLegacy = task && !task.rule && initialRule.mode === mode && initialRule.days === nextRule.days
      const reopen = data.has('reopen')
      record = { ...task, ...base, date, notes, interval: nextRule.days ?? 0, rule: preserveLegacy ? undefined : nextRule,
        lastDone: reopen ? '' : task?.lastDone ?? '', skipped: reopen || mode !== 'once' ? undefined : task?.skipped,
        snoozedUntil: task?.date === date && !reopen ? task?.snoozedUntil : undefined }
    }
    else if (collection === 'calendar') record = { ...base, date, notes, time: read('time') }
    else if (collection === 'pantry') record = { ...base, quantity: Number(read('quantity')), threshold: Number(read('threshold')), unit: read('unit'), favorite: data.has('favorite'), expires: read('expires') || undefined }
    else if (collection === 'groceries' && editor.listId) record = { ...base, listId: editor.listId, done: (item as Grocery | undefined)?.done ?? false }
    if (!save(record)) setError('Could not save. Check device storage and try again.')
  }
  return <Dialog heading={(item ? 'Edit ' : 'Add ') + recordNames[collection]} close={close}>
    <form onSubmit={submit}>
      <label>Name<input name="name" required maxLength={120} defaultValue={item?.name} autoFocus /></label>
      {(isSchedule || collection === 'calendar') && <label>{isSchedule ? 'Due date' : 'Date'}<input name="date" type="date" required min="1900-01-01" max="9900-12-31" defaultValue={datedItem?.date || editor.date || today} /></label>}
      <CategorySelect categories={categories} value={item?.categoryId} />
      {isSchedule && <>
        <label>Repeat<select name="repeat" value={mode} onChange={event => setMode(event.target.value as RecurrenceMode)}>
          {Object.entries(recurrenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        {(mode === 'interval' || mode === 'completion') && <label>Interval in days<input name="interval" type="number" min="1" max="36500"
          step="1" required defaultValue={initialRule.days || 7} /></label>}
        {mode === 'monthly' && <label>Day of the month<input name="monthDay" type="number" min="1" max="31" step="1"
          required defaultValue={initialRule.monthDay ?? Number((datedItem?.date || today).slice(-2))} /></label>}
        {mode === 'weekdays' && <fieldset className="weekday-picker">
          <legend>Repeat on</legend>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => <label key={day}>
            <input type="checkbox" name="weekday" value={index} defaultChecked={initialRule.weekdays?.includes(index)} />{day}</label>)}
        </fieldset>}
        {!!(task?.lastDone || task?.skipped) && <label className="grocery"><input type="checkbox" name="reopen" />Clear last completion or skip</label>}
      </>}
      {collection === 'calendar' && <label>Time (optional)<input name="time" type="time" defaultValue={entry?.time} /></label>}
      {(isSchedule || collection === 'calendar') && <label>Notes<textarea name="notes" rows={3} maxLength={1000} defaultValue={datedItem?.notes} /></label>}
      {collection === 'pantry' && <><div className="form-grid">
        <label>Quantity<input required name="quantity" type="number" min="0" step="any" defaultValue={pantry?.quantity ?? 0} /></label>
        <label>Low-stock threshold<input required name="threshold" type="number" min="0" step="any" defaultValue={pantry?.threshold ?? 1} /></label>
      </div><label>Unit (optional)<input name="unit" maxLength={40} placeholder="e.g. bags" defaultValue={pantry?.unit} /></label>
      <label>Expiration (optional)<input name="expires" type="date" min="1900-01-01" max="9900-12-31" defaultValue={pantry?.expires} /></label>
      <label className="grocery"><input name="favorite" type="checkbox" defaultChecked={pantry?.favorite} /> Favorite product</label></>}
      {error && <p className="message error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {item && <button type="button" className="danger" onClick={() => remove(item)}><Trash2 size={16} /> Delete</button>}
        <button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" type="submit">Save</button>
      </div>
    </form>
  </Dialog>
}
