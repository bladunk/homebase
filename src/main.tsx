import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowUpRight, Box, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Download, House, Menu, PackageOpen, PawPrint, Pencil, Plus, ShoppingBasket, Sprout, Trash2, Upload, Wrench, X } from 'lucide-react'
import { activeTask, dayKey, finishTask, formatDay, offsetDay, parseBackup, seed, storageKey, type Collection, type Event, type Grocery, type Pantry, type RecordItem, type Schedule, type State } from './data'
import './style.css'

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: House },
  { id: 'chores', label: 'Chores', icon: ClipboardList },
  { id: 'pantry', label: 'Pantry', icon: PackageOpen },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBasket },
  { id: 'dog', label: 'Dog care', icon: PawPrint },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'backup', label: 'Backup & restore', icon: Download },
] as const
type Page = typeof navigation[number]['id']
const recordNames: Record<Collection, string> = {
  chores: 'chore', pantry: 'pantry item', lists: 'shopping list', groceries: 'shopping item',
  medication: 'medication', vet: 'vet visit', calendar: 'event', maintenance: 'maintenance task',
}
type Editor = { collection: Collection; item?: RecordItem; listId?: string; date?: string }
const scheduled = ['chores', 'medication', 'vet', 'maintenance'] as const
const subtitles: Record<Page, string> = {
  dashboard: '', chores: 'Keep the everyday work on a schedule.', pantry: 'Track what you have and see what’s running low.',
  shopping: 'Keep separate lists for each kind of shopping trip.', dog: 'Keep medication schedules and vet visits in one place.',
  calendar: 'See household events and scheduled tasks together.', maintenance: 'Keep track of appliance care and service dates.',
  backup: 'Download a copy of your household data or import a backup.',
}

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey)
    return { data: saved ? parseBackup(saved) : seed(), error: '' }
  } catch {
    return { data: seed(), error: 'Saved data could not be loaded. Restore a backup or make an edit to start saving the sample data.' }
  }
}

function App() {
  const [initial] = useState(loadState)
  const [state, setState] = useState(initial.data)
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(initial.error)
  const [page, setPage] = useState<Page>('dashboard')
  const [menu, setMenu] = useState(false)
  const [editor, setEditor] = useState<Editor>()
  const [pendingRestore, setPendingRestore] = useState<State>()
  const [today, setToday] = useState(dayKey)
  const [selectedDay, setSelectedDay] = useState(dayKey)
  const [month, setMonth] = useState(() => dayKey().slice(0, 7))
  const fileInput = useRef<HTMLInputElement>(null)
  const main = useRef<HTMLElement>(null)
  useEffect(() => {
    const update = () => setToday(dayKey())
    const timer = window.setInterval(update, 30000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  useEffect(() => {
    if (!initial.error) {
      try { if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, JSON.stringify(initial.data)) }
      catch { setStorageError('This browser could not save HomeBase data.') }
    }
  }, [initial])

  function persist(next: State, message: string) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setState(next)
      setStorageError('')
      setNotice(message)
      return true
    } catch {
      setStorageError('HomeBase could not save this change. Check device storage or browser settings and try again.')
      return false
    }
  }

  function go(target: Page) {
    setPage(target)
    setMenu(false)
    setNotice('')
    window.scrollTo(0, 0)
    main.current?.focus({ preventScroll: true })
  }

  function save(collection: Collection, item: RecordItem, message = 'Changes saved.') {
    const rows: RecordItem[] = state[collection]
    const next = rows.some(row => row.id === item.id) ? rows.map(row => row.id === item.id ? item : row) : [...rows, item]
    return persist({ ...state, [collection]: next }, message)
  }

  function remove(collection: Collection, item: RecordItem) {
    const label = collection === 'lists' ? item.name + ' and all its items' : item.name
    if (!window.confirm('Delete ' + label + '?')) return false
    const next = { ...state, [collection]: state[collection].filter(row => row.id !== item.id) }
    if (collection === 'lists') next.groceries = state.groceries.filter(row => row.listId !== item.id)
    return persist(next, 'Deleted.')
  }

  const tasks = scheduled.flatMap(collection => state[collection].filter(activeTask).map(task => ({ collection, task })))
  const due = tasks.filter(({ task }) => task.date <= today).sort((a, b) => a.task.date.localeCompare(b.task.date))
  const low = state.pantry.filter(item => item.quantity <= item.threshold)
  const dated = [
    ...tasks.map(({ collection, task }) => ({ collection, item: task, date: task.date, time: '' })),
    ...state.calendar.map(item => ({ collection: 'calendar' as const, item, date: item.date, time: item.time })),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const upcoming = dated.filter(entry => entry.date > today || (entry.date === today && entry.collection === 'calendar'))
  const first = new Date(month + '-01T12:00:00')
  const leading = (first.getDay() + 6) % 7
  const monthSize = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()

  function scheduleRows(collection: typeof scheduled[number]) {
    return [...state[collection]].sort((a, b) => Number(activeTask(b)) - Number(activeTask(a)) || a.date.localeCompare(b.date)).map(task =>
      <TaskRow key={task.id} task={task} today={today} edit={() => setEditor({ collection, item: task })}
        done={() => save(collection, finishTask(task, today), task.interval ? 'Completed. Next date scheduled.' : 'Marked complete.')} />)
  }

  function addToShopping(item: Pantry) {
    if (!state.lists.length) { setEditor({ collection: 'lists' }); setNotice('Create a shopping list first.'); return }
    const list = state.lists[0]
    if (state.groceries.some(row => row.listId === list.id && !row.done && row.name.toLowerCase() === item.name.toLowerCase())) {
      setNotice(item.name + ' is already on ' + list.name + '.')
      return
    }
    save('groceries', { id: crypto.randomUUID(), name: item.name, listId: list.id, done: false }, 'Added to ' + list.name + '.')
  }

  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'homebase-' + today + '.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
    setNotice('Backup downloaded.')
  }

  return <div className="shell">
    <a className="skip" href="#content">Skip to content</a>
    <aside className={'sidebar ' + (menu ? 'expanded' : '')}>
      <div className="brand-bar">
        <button className="brand" onClick={() => go('dashboard')}><span className="brand-icon"><House size={22} /></span><span>HomeBase<small>HOUSEHOLD PLANNER</small></span></button>
        <button className="icon-button menu-button" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button>
      </div>
      <nav id="navigation" aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) =>
        <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}><Icon size={19} />{label}</button>)}</nav>
      <div className="sidebar-foot"><span className="status-dot" /> Stored on this device</div>
    </aside>
    <main id="content" ref={main} tabIndex={-1}>
      <div className="topline"><span>{navigation.find(item => item.id === page)?.label}</span><span><CalendarDays size={16} />{formatDay(today, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
      {storageError && <p className="message error" role="alert">{storageError}</p>}
      <div aria-live="polite">{notice && <div className="message flex items-center justify-between gap-3">{notice}<button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice('')}><X size={17} /></button></div>}</div>
      {page !== 'dashboard' && <header className="page-head"><h1>{navigation.find(item => item.id === page)?.label}</h1><p>{subtitles[page]}</p></header>}
      {page === 'dashboard' && <>
        <header className="hero">
          <div><span className="hero-label"><Sprout size={16} /> YOUR HOUSEHOLD</span><h1>Welcome home.</h1><p>See what’s due, what’s running low, and what’s coming up.</p>
            <button className="primary hero-button" onClick={() => setEditor({ collection: 'chores' })}><Plus size={18} /> New chore</button></div>
          <div className="hero-art" aria-hidden="true"><div className="hero-orbit"><House /></div><Sprout className="hero-sprout" /></div>
        </header>
        <div className="stats">
          <Stat icon={<ClipboardList />} value={due.length} label="Due today or overdue" onClick={() => document.getElementById('due-tasks')?.focus()} />
          <Stat icon={<Box />} value={low.length} label="Low-stock items" onClick={() => go('pantry')} />
          <Stat icon={<ShoppingBasket />} value={state.groceries.filter(item => !item.done).length} label="Items to buy" onClick={() => go('shopping')} />
        </div>
        <div className="dashboard-grid">
          <Panel id="due-tasks" heading="Needs attention" icon={<ClipboardList />} action={<button className="text-button" onClick={() => go('calendar')}>Calendar <ArrowUpRight size={15} /></button>}>
            {due.length ? due.map(({ collection, task }) => <TaskRow key={collection + task.id} task={task} today={today} edit={() => setEditor({ collection, item: task })} done={() => save(collection, finishTask(task, today), 'Marked complete.')} />) : <Empty>Nothing is due today.</Empty>}
          </Panel>
          <Panel heading="Coming up" icon={<CalendarDays />}>
            {upcoming.length ? upcoming.slice(0, 5).map(({ collection, date, item }) =>
              <button className="agenda-row" key={collection + item.id} onClick={() => setEditor({ collection, item })}><span className="date-chip">{formatDay(date)}</span><span><strong>{item.name}</strong><small>{recordNames[collection]}</small></span></button>) : <Empty>No upcoming events or tasks.</Empty>}
          </Panel>
        </div>
      </>}
      {page === 'chores' && <Panel heading="Chore schedule" icon={<ClipboardList />} action={<Add onClick={() => setEditor({ collection: 'chores' })}>Add chore</Add>}>{state.chores.length ? scheduleRows('chores') : <Empty>Add a chore to start your schedule.</Empty>}</Panel>}
      {page === 'maintenance' && <Panel heading="Maintenance schedule" icon={<Wrench />} action={<Add onClick={() => setEditor({ collection: 'maintenance' })}>Add task</Add>}>{state.maintenance.length ? scheduleRows('maintenance') : <Empty>No maintenance tasks scheduled.</Empty>}</Panel>}
      {page === 'dog' && <div className="dashboard-grid">
        <Panel heading="Medication" icon={<PawPrint />} action={<Add onClick={() => setEditor({ collection: 'medication' })}>Add medication</Add>}>{state.medication.length ? scheduleRows('medication') : <Empty>No medications recorded.</Empty>}</Panel>
        <Panel heading="Vet visits" icon={<CalendarDays />} action={<Add onClick={() => setEditor({ collection: 'vet' })}>Add visit</Add>}>{state.vet.length ? scheduleRows('vet') : <Empty>No vet visits recorded.</Empty>}</Panel>
      </div>}
      {page === 'pantry' && <>
        {!!low.length && <p className="message stock-alert" role="status"><PackageOpen size={19} />{low.length} {low.length === 1 ? 'item is' : 'items are'} at or below the low-stock threshold.</p>}
        <Panel heading="Inventory" icon={<PackageOpen />} action={<Add onClick={() => setEditor({ collection: 'pantry' })}>Add item</Add>}>
          {state.pantry.length ? state.pantry.map(item => <div className="record-row pantry-row" key={item.id}>
            <div className="record-info"><strong>{item.name}</strong><small>{item.quantity} {item.unit || 'on hand'} · Low at {item.threshold}</small></div>
            <div className="row-actions">{item.quantity <= item.threshold && <><span className="pill warning">Low stock</span><button className="icon-button" title="Add to shopping" aria-label={'Add ' + item.name + ' to shopping'} onClick={() => addToShopping(item)}><ShoppingBasket size={19} /></button></>}
              <EditButton name={item.name} action={() => setEditor({ collection: 'pantry', item })} />
            </div>
          </div>) : <Empty>Your pantry is empty.</Empty>}
        </Panel>
      </>}
      {page === 'shopping' && <>
        <div className="section-action"><Add onClick={() => setEditor({ collection: 'lists' })}>New list</Add></div>
        <div className="dashboard-grid">{state.lists.map(list => {
          const items = state.groceries.filter(item => item.listId === list.id)
          return <Panel key={list.id} heading={list.name} icon={<ShoppingBasket />} action={<EditButton name={list.name} action={() => setEditor({ collection: 'lists', item: list })} />}>
            <div className="list-meta">{items.filter(item => item.done).length} of {items.length} checked</div>
            {items.map(item => <div className="record-row" key={item.id}>
              <label className={'grocery ' + (item.done ? 'checked' : '')}><input type="checkbox" checked={item.done} onChange={event => save('groceries', { ...item, done: event.target.checked })} />{item.name}</label>
              <EditButton name={item.name} action={() => setEditor({ collection: 'groceries', item, listId: list.id })} />
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
        <Panel heading="Export data" icon={<Download />}><div className="backup-body"><p>Save a JSON copy of all your household records to Files.</p><button className="primary" onClick={download}><Download size={18} /> Download backup</button></div></Panel>
        <Panel heading="Restore data" icon={<Upload />}><div className="backup-body"><p>Import a HomeBase V1 backup. Restoring replaces the records on this device.</p>
          <input type="file" ref={fileInput} hidden accept=".json,application/json" onChange={async event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            try { setPendingRestore(parseBackup(await file.text())); setNotice('') }
            catch (error) { setNotice(error instanceof SyntaxError ? 'This file is not valid JSON.' : error instanceof Error ? error.message : 'Unable to read the backup.') }
          }} />
          <button className="secondary" onClick={() => fileInput.current?.click()}><Upload size={18} /> Choose backup</button></div></Panel>
      </div>}
      <footer>HomeBase · Your household planner</footer>
    </main>
    {editor && <RecordEditor key={editor.collection + (editor.item?.id || 'new')} editor={editor} today={today} close={() => setEditor(undefined)}
      save={item => {
        const saved = save(editor.collection, item)
        if (saved) setEditor(undefined)
        return saved
      }}
      remove={item => { if (remove(editor.collection, item)) setEditor(undefined) }} />}
    {pendingRestore && <Dialog heading="Restore this backup?" close={() => setPendingRestore(undefined)}>
      <p>This replaces all HomeBase records on this device.</p>
      {storageError && <p className="message error" role="alert">{storageError}</p>}
      <div className="dialog-actions"><button className="secondary" onClick={() => setPendingRestore(undefined)}>Cancel</button><button className="primary" onClick={() => {
        if (persist(pendingRestore, 'Backup restored.')) setPendingRestore(undefined)
      }}>Restore backup</button></div>
    </Dialog>}
  </div>
}

function Panel({ id, heading, icon, action, children }: { id?: string; heading: string; icon: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className="panel" id={id} tabIndex={id ? -1 : undefined}><header><span className="panel-icon">{icon}</span><h2>{heading}</h2>{action && <div className="panel-action">{action}</div>}</header>{children}</section>
}

function Stat({ icon, label, value, onClick }: { icon: ReactNode; label: string; value: number; onClick: () => void }) {
  return <button className="stat" onClick={onClick}><span className="stat-icon">{icon}</span><span><strong>{value}</strong><small>{label}</small></span><ArrowUpRight className="stat-arrow" size={17} /></button>
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

function TaskRow({ task, today, edit, done }: { task: Schedule; today: string; edit: () => void; done: () => void }) {
  const active = activeTask(task)
  const status = active ? task.date < today ? 'Overdue' : task.date === today ? 'Today' : formatDay(task.date) : 'Completed'
  return <div className="record-row">
    <button className="check-button" disabled={!active} aria-label={'Complete ' + task.name} onClick={done}><Check size={17} /></button>
    <div className="record-info"><strong>{task.name}</strong><small>{task.interval ? 'Every ' + task.interval + (task.interval === 1 ? ' day' : ' days') : 'One time'}{task.lastDone && ' · Last done ' + formatDay(task.lastDone)}</small>{task.notes && <small>{task.notes}</small>}</div>
    <span className={'pill ' + (active && task.date <= today ? 'warning' : '')}>{status}</span>
    <EditButton name={task.name} action={edit} />
  </div>
}

function Dialog({ heading, close, children }: { heading: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close() }}>
    <header><h2 id="dialog-title">{heading}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={21} /></button></header>
    {children}
  </dialog>
}

function RecordEditor({ editor, today, close, save, remove }: { editor: Editor; today: string; close: () => void; save: (item: RecordItem) => boolean; remove: (item: RecordItem) => void }) {
  const { collection, item } = editor
  const isSchedule = scheduled.some(key => key === collection)
  const task = item as Schedule | undefined
  const pantry = item as Pantry | undefined
  const entry = item as Event | undefined
  const datedItem = item as (Event | Schedule) | undefined
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (key: string) => String(data.get(key) ?? '').trim()
    const name = read('name')
    if (!name) { setError('Enter a name.'); return }
    const base = { id: item?.id || crypto.randomUUID(), name }
    const date = read('date')
    const notes = read('notes')
    if ((isSchedule || collection === 'calendar') && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Enter a valid date.'); return }
    let record: RecordItem = base
    if (isSchedule) record = { ...base, date, notes, interval: Number(read('interval')), lastDone: data.has('reopen') ? '' : task?.lastDone ?? '' }
    else if (collection === 'calendar') record = { ...base, date, notes, time: read('time') }
    else if (collection === 'pantry') record = { ...base, quantity: Number(read('quantity')), threshold: Number(read('threshold')), unit: read('unit') }
    else if (collection === 'groceries' && editor.listId) record = { ...base, listId: editor.listId, done: (item as Grocery | undefined)?.done ?? false }
    if (!save(record)) setError('Could not save. Check device storage and try again.')
  }
  return <Dialog heading={(item ? 'Edit ' : 'Add ') + recordNames[collection]} close={close}>
    <form onSubmit={submit}>
      <label>Name<input name="name" required maxLength={120} defaultValue={item?.name} autoFocus /></label>
      {(isSchedule || collection === 'calendar') && <label>{isSchedule ? 'Due date' : 'Date'}<input name="date" type="date" required min="1900-01-01" max="9900-12-31" defaultValue={datedItem?.date || editor.date || today} /></label>}
      {isSchedule && <><label>Repeat every (days)<input name="interval" type="number" min="0" max="36500" step="1" required defaultValue={task?.interval ?? (collection === 'chores' ? 7 : 0)} /><small>Use 0 for a one-time task.</small></label>
        {!!task?.lastDone && <label className="grocery"><input type="checkbox" name="reopen" />Clear last completion</label>}</>}
      {collection === 'calendar' && <label>Time (optional)<input name="time" type="time" defaultValue={entry?.time} /></label>}
      {(isSchedule || collection === 'calendar') && <label>Notes<textarea name="notes" rows={3} maxLength={1000} defaultValue={datedItem?.notes} /></label>}
      {collection === 'pantry' && <><div className="form-grid">
        <label>Quantity<input required name="quantity" type="number" min="0" step="any" defaultValue={pantry?.quantity ?? 0} /></label>
        <label>Low-stock threshold<input required name="threshold" type="number" min="0" step="any" defaultValue={pantry?.threshold ?? 1} /></label>
      </div><label>Unit (optional)<input name="unit" maxLength={40} placeholder="e.g. bags" defaultValue={pantry?.unit} /></label></>}
      {error && <p className="message error" role="alert">{error}</p>}
      <div className="dialog-actions">
        {item && <button type="button" className="danger" onClick={() => remove(item)}><Trash2 size={16} /> Delete</button>}
        <button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" type="submit">Save</button>
      </div>
    </form>
  </Dialog>
}

createRoot(document.getElementById('root')!).render(<App />)
