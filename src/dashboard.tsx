import { useState, type CSSProperties, type ReactNode } from 'react'
import { Bell, CalendarDays, Check, ClipboardList, Clock, Coffee, Ellipsis, Heart, House, PackageOpen, PawPrint, Plus, ShoppingBasket, SlidersHorizontal, Sprout, Sparkles, Tag, Wrench } from 'lucide-react'
import { collections, formatDay, type Collection, type RecordItem, type Schedule, type ScheduledCollection, type State } from './data'
import { widgetDefinitions, type DashboardPreferences, type WidgetPreference } from './dashboard-preferences'
import { expirationStatus, isLowStock } from './inventory'
import { dueDate, isActive } from './recurrence'

const icons = {
  clipboard: ClipboardList, pantry: PackageOpen, basket: ShoppingBasket, calendar: CalendarDays, paw: PawPrint,
  tools: Wrench, bell: Bell, leaf: Sprout, home: House, sparkles: Sparkles, heart: Heart, coffee: Coffee,
  clock: Clock, tag: Tag,
}

export function CategoryIcon({ widget }: { widget: Pick<WidgetPreference, 'color' | 'icon'> }) {
  const Icon = icons[widget.icon]
  return <span className="category-icon" data-color={widget.color} aria-hidden="true"><Icon size={18} /></span>
}

type Entry = { collection: ScheduledCollection | 'calendar'; item: RecordItem; date: string }
type DashboardSection = 'pantry' | 'shopping' | 'calendar' | 'dog' | 'maintenance' | 'chores' | 'routines' | 'categories'
type DashboardProps = {
  state: State
  today: string
  preferences: DashboardPreferences
  due: { collection: ScheduledCollection; task: Schedule }[]
  upcoming: Entry[]
  go: (section: DashboardSection) => void
  edit: (collection: Collection, item: RecordItem) => void
  complete: (collection: ScheduledCollection, task: Schedule) => boolean
  activity: (collection: ScheduledCollection, task: Schedule) => void
  addChore: () => void
  customize: () => void
}

export function Dashboard(props: DashboardProps) {
  const { today, preferences, addChore, customize } = props
  const visible = preferences.widgets.filter(widget => widget.visible)
  return <>
    <header className="command-header" style={preferences.accent ? { borderColor: preferences.accent } : undefined}>
      <div>
        <p className="command-date"><time dateTime={today}>{formatDay(today, { weekday: 'long', month: 'long', day: 'numeric' })}</time></p>
        <h1>At home</h1>
      </div>
      <div className="command-actions">
        <button className="command-action" onClick={customize}><SlidersHorizontal size={17} /><span>Customize</span></button>
        <button className="command-action command-add" onClick={addChore}><Plus size={18} /><span>New chore</span></button>
      </div>
    </header>
    <div className="command-layout" data-density={preferences.density} style={preferences.accent ? { '--dashboard-accent': preferences.accent } as CSSProperties : undefined}>
      {preferences.sections.map(section => {
        const widgets = visible.filter(widget => widget.sectionId === section.id)
        if (!widgets.length) return null
        return <section key={section.id} className="dashboard-section" aria-label={section.name}>
          {(preferences.sections.length > 1 || section.name !== 'Overview') && <h2 className="dashboard-section-title">{section.name}</h2>}
          <div className="command-grid">{widgets.map(widget => <DashboardWidget key={widget.id} {...props} widget={widget} />)}</div>
        </section>
      })}
      {!visible.length && <div className="command-widget widget-placeholder">
        <p>All dashboard widgets are hidden or removed.</p><button className="secondary" onClick={customize}>Show widgets</button>
      </div>}
    </div>
  </>
}

function DashboardWidget({ widget, state, today, preferences, due, upcoming, go, edit, complete, activity }: DashboardProps & { widget: WidgetPreference }) {
  const [expanded, setExpanded] = useState(false)
  const listLength = preferences.density === 'expanded' ? 4 : 2
  const explicitList = widget.style === 'list'
  const metric = widget.style === 'metric'
  const low = state.pantry.filter(isLowStock)
  const checked = state.groceries.filter(item => item.done).length
  const dueChores = (task: Schedule) => isActive(task) && dueDate(task) <= today
  const choreRows = state.chores.filter(task => dueChores(task) || task.lastDone === today)
  const choreIsDone = (task: Schedule) => task.lastDone === today && !dueChores(task)

  function renderTasks(tasks: { collection: ScheduledCollection; task: Schedule }[], limit: number) {
    return <>
      <ul className="command-chores">{(expanded ? tasks : tasks.slice(0, limit)).map(({ collection, task }) =>
        <QuickTask key={collection + ':' + task.id} task={task} today={today}
          done={collection === 'chores' && choreIsDone(task)} complete={() => complete(collection, task)}
          edit={() => edit(collection, task)} activity={() => activity(collection, task)} />)}
      </ul>
      {tasks.length > limit && <button className="command-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Show fewer tasks' : 'Show all ' + tasks.length + ' tasks'}
      </button>}
    </>
  }

  function inventoryWidget(items: typeof low, status: string, empty: string) {
    return <Widget widget={widget} open={() => go('pantry')}>
      {explicitList && items.length ? <WidgetList rows={items.slice(0, listLength)} /> : <Metric count={items.length} status={status} />}
      {!metric && !explicitList && <p className="widget-note">{items.length ? previewNames(items) : empty}</p>}
      {explicitList && !items.length && <p className="widget-empty">{empty}</p>}
    </Widget>
  }

  switch (widget.kind) {
    case 'today': {
      const done = choreRows.filter(choreIsDone).length
      return <Widget widget={widget} open={metric ? () => go('chores') : undefined} action={<Progress value={done} total={choreRows.length} label="Chores complete" />}>
        {metric ? <Metric count={choreRows.length - done} status="to do" /> :
          choreRows.length ? renderTasks(choreRows.map(task => ({ collection: 'chores', task })), listLength + 2) : <p className="widget-empty">No chores due today.</p>}
      </Widget>
    }
    case 'pantry':
      return inventoryWidget(low, 'low stock', state.pantry.length ? 'Stock looks good' : 'No pantry items')
    case 'shopping': {
      const open = state.groceries.filter(item => !item.done)
      return <Widget widget={widget} open={() => go('shopping')} action={<Progress value={checked} total={state.groceries.length} label="Shopping items checked" compact />}>
        {explicitList && open.length ? <WidgetList rows={open.slice(0, listLength)} /> : <Metric count={open.length} status="to buy" />}
        {!metric && !explicitList && <p className="widget-note">{state.lists.length ? state.lists.length + (state.lists.length === 1 ? ' shopping list' : ' shopping lists') : 'No shopping lists'}</p>}
      </Widget>
    }
    case 'calendar':
      return <Widget widget={widget} open={() => go('calendar')}>
        {metric ? <Metric count={upcoming.length} status="upcoming" /> : upcoming.length ?
          <ul className="widget-agenda">{upcoming.slice(0, explicitList ? listLength + 1 : listLength).map(({ collection, item, date }) =>
            <li key={collection + ':' + item.id}><button onClick={() => edit(collection, item)}><time dateTime={date}>{date === today ? 'Today' : formatDay(date)}</time><span>{item.name}</span></button></li>
          )}</ul> : <p className="widget-empty">Nothing coming up.</p>}
      </Widget>
    case 'dog':
    case 'maintenance': {
      const pet = widget.kind === 'dog'
      const tasks = (pet ? [...state.medication, ...state.vet] : state.maintenance).filter(isActive)
        .sort((a, b) => dueDate(a).localeCompare(dueDate(b)))
      return <Widget widget={widget} open={() => go(pet ? 'dog' : 'maintenance')}>
        {metric ? <Metric count={tasks.filter(task => dueDate(task) <= today).length} status="due" /> :
          explicitList && tasks.length ? <WidgetList rows={tasks.slice(0, listLength)} /> :
          <ScheduleSummary tasks={tasks} today={today} empty={pet ? 'No care scheduled' : 'No service scheduled'} />}
      </Widget>
    }
    case 'attention': {
      const rows = due.filter(({ collection }) => collection !== 'chores')
      return <Widget widget={widget} open={metric ? () => go('calendar') : undefined}>
        {metric ? <Metric count={rows.length} status="due" /> :
          rows.length ? renderTasks(rows, listLength) : <p className="widget-empty">No pet care or maintenance due.</p>}
      </Widget>
    }
    case 'routines': {
      const routines = state.routines ?? []
      const stepIds = new Set(routines.flatMap(routine => routine.choreIds))
      const doneIds = new Set(state.chores.filter(task => stepIds.has(task.id) && task.lastDone === today).map(task => task.id))
      for (const routine of routines) {
        for (const [id, date] of Object.entries(routine.checkoffs ?? {})) if (date === today) doneIds.add(id)
      }
      const done = doneIds.size
      return <Widget widget={widget} open={() => go('routines')} action={<Progress value={done} total={stepIds.size} label="Routine chores done" compact />}>
        {explicitList && routines.length ? <WidgetList rows={routines.slice(0, listLength)} /> : <Metric count={routines.length} status={routines.length === 1 ? 'routine' : 'routines'} />}
        {!metric && !explicitList && <p className="widget-note">{done}/{stepIds.size} chores done today</p>}
      </Widget>
    }
    case 'expiry': return inventoryWidget(state.pantry.filter(item => expirationStatus(item, today)), 'need checking', 'No upcoming expirations')
    case 'favorites': return inventoryWidget(state.pantry.filter(item => item.favorite), 'favorites', 'No favorite products')
    case 'activity': {
      const category = state.categories?.find(row => row.id === widget.categoryId)
      const records = category ? [...collections.flatMap(key => state[key] as RecordItem[]), ...(state.routines ?? [])]
        .filter(item => item.categoryId === category.id) : []
      return <Widget widget={widget} label={category?.name} open={() => go('categories')}>
        {explicitList && records.length ? <WidgetList rows={records.slice(0, listLength)} /> : <Metric count={records.length} status="records" />}
        {!category && <p className="widget-note">Choose a category in Customize.</p>}
      </Widget>
    }
  }
}

function Widget({ widget, action, open, label = widgetDefinitions[widget.kind].label, children }: {
  widget: WidgetPreference; action?: ReactNode; open?: () => void; label?: string; children: ReactNode
}) {
  return <section className={'command-widget' + (widget.size === 'full' ? ' widget-wide' : '')} data-color={widget.color} aria-labelledby={'widget-' + widget.id}>
    <header className="widget-header">
      <h2 id={'widget-' + widget.id}>{open
        ? <button className="widget-title" onClick={open}><CategoryIcon widget={widget} /><span>{label}</span></button>
        : <span className="widget-title"><CategoryIcon widget={widget} /><span>{label}</span></span>}
      </h2>
      {action}
    </header>
    {children}
  </section>
}

function WidgetList({ rows }: { rows: { id: string; name: string }[] }) {
  return <ul className="widget-list">{rows.map((row, index) => <li key={row.id + ':' + index}>{row.name}</li>)}</ul>
}

function Metric({ count, status }: { count: number; status: string }) {
  return <div className="widget-stat"><strong>{count}</strong><span>{status}</span></div>
}

function previewNames(items: { name: string }[]) {
  return items.length > 2 ? items[0].name + ' +' + (items.length - 1) : items.map(item => item.name).join(' · ')
}

function ScheduleSummary({ tasks, today, empty }: { tasks: Schedule[]; today: string; empty: string }) {
  const due = tasks.filter(task => dueDate(task) <= today)
  const next = tasks[0]
  if (!next) return <p className="widget-empty">{empty}</p>
  return <>
    {due.length ? <Metric count={due.length} status="due" /> :
      <div className="widget-stat"><strong className="widget-next"><time dateTime={dueDate(next)}>{formatDay(dueDate(next))}</time></strong></div>}
    <p className="widget-note">{due.length ? previewNames(due) : next.name}</p>
  </>
}

function Progress({ value, total, label, compact }: { value: number; total: number; label: string; compact?: boolean }) {
  return <span className={'widget-progress' + (compact ? ' progress-compact' : '')} role="img" aria-label={label + ': ' + value + ' of ' + total}>
    {!compact && <span aria-hidden="true">{value}/{total} done</span>}
    <svg viewBox="0 0 36 36" aria-hidden="true" fill="none">
      <circle className="ring-track" cx="18" cy="18" r="15" />
      <circle className="ring-value" cx="18" cy="18" r="15" pathLength="100" strokeOpacity={value ? 1 : 0}
        strokeDasharray={(total ? value / total * 100 : 0) + ' 100'} transform="rotate(-90 18 18)" />
    </svg>
  </span>
}

function QuickTask({ task, today, done, complete, edit, activity }: {
  task: Schedule; today: string; done: boolean; complete: () => boolean; edit: () => void; activity: () => void
}) {
  return <li className="command-task" data-done={done}>
    <button className="quick-check" type="button" aria-label={done ? task.name + ' completed' : 'Complete ' + task.name}
      aria-disabled={done || undefined} onClick={() => { if (!done) complete() }}><Check size={16} aria-hidden="true" /></button>
    <button className="quick-edit" type="button" aria-label={'Edit ' + task.name} onClick={edit}>
      <span>{task.name}</span>{!done && dueDate(task) < today && <small>Overdue</small>}
    </button>
    <button className="icon-button quick-activity" type="button" aria-label={'Activity for ' + task.name} onClick={activity}><Ellipsis size={17} /></button>
  </li>
}
