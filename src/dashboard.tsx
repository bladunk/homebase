import { useState, type ReactNode } from 'react'
import { Bell, CalendarDays, Check, ChevronDown, ChevronUp, ClipboardList, Coffee, Heart, House, PackageOpen, PawPrint, Plus, ShoppingBasket, SlidersHorizontal, Sprout, Sparkles, Wrench } from 'lucide-react'
import { activeTask, formatDay, type Collection, type RecordItem, type Schedule, type State } from './data'
import { categoryColors, defaultPreferences, iconLabels, moveWidget, themeOptions, widgetDefinitions, type DashboardPreferences, type IconId, type WidgetId, type WidgetPreference } from './dashboard-preferences'

const icons = {
  clipboard: ClipboardList, pantry: PackageOpen, basket: ShoppingBasket, calendar: CalendarDays, paw: PawPrint,
  tools: Wrench, bell: Bell, leaf: Sprout, home: House, sparkles: Sparkles, heart: Heart, coffee: Coffee,
}

export function CategoryIcon({ widget }: { widget: WidgetPreference }) {
  const Icon = icons[widget.icon]
  return <span className="category-icon" data-color={widget.color} aria-hidden="true"><Icon size={18} /></span>
}

type ScheduledCollection = 'chores' | 'medication' | 'vet' | 'maintenance'
type Entry = { collection: ScheduledCollection | 'calendar'; item: RecordItem; date: string }
type DashboardSection = 'pantry' | 'shopping' | 'calendar' | 'dog' | 'maintenance' | 'chores'

export function Dashboard({ state, today, preferences, due, upcoming, go, edit, complete, addChore, customize }: {
  state: State
  today: string
  preferences: DashboardPreferences
  due: { collection: ScheduledCollection; task: Schedule }[]
  upcoming: Entry[]
  go: (section: DashboardSection) => void
  edit: (collection: Collection, item: RecordItem) => void
  complete: (collection: ScheduledCollection, task: Schedule) => boolean
  addChore: () => void
  customize: () => void
}) {
  const [showAllChores, setShowAllChores] = useState(false)
  const [showAllDue, setShowAllDue] = useState(false)
  const choreRows = state.chores.filter(chore => (activeTask(chore) && chore.date <= today) || chore.lastDone === today)
  const choreIsDone = (chore: Schedule) => chore.lastDone === today && (!activeTask(chore) || chore.date > today)
  const done = choreRows.filter(choreIsDone).length
  const low = state.pantry.filter(item => item.quantity <= item.threshold)
  const checked = state.groceries.filter(item => item.done).length
  const attention = due.filter(({ collection }) => collection !== 'chores')
  const pets = [...state.medication, ...state.vet].filter(activeTask)
  const appliances = state.maintenance.filter(activeTask)
  const visible = preferences.widgets.filter(widget => widget.visible)

  return <>
    <header className="command-header">
      <div>
        <p className="command-date"><time dateTime={today}>{formatDay(today, { weekday: 'long', month: 'long', day: 'numeric' })}</time></p>
        <h1>At home</h1>
      </div>
      <div className="command-actions">
        <button className="command-action" onClick={customize}><SlidersHorizontal size={17} /><span>Customize</span></button>
        <button className="command-action command-add" onClick={addChore}><Plus size={18} /><span>New chore</span></button>
      </div>
    </header>
    <div className="command-grid">
      {visible.map(widget => {
        switch (widget.id) {
          case 'today':
            return <Widget key={widget.id} widget={widget} wide action={<Progress value={done} total={choreRows.length} label="Chores complete" />}>
              {choreRows.length ? <>
                <ul className="command-chores">{(showAllChores ? choreRows : choreRows.slice(0, 4)).map(task =>
                  <QuickTask key={task.id} task={task} today={today} done={choreIsDone(task)} complete={() => complete('chores', task)} edit={() => edit('chores', task)} />)}
                </ul>
                {choreRows.length > 4 && <button className="command-more" onClick={() => setShowAllChores(!showAllChores)}>{showAllChores ? 'Show fewer chores' : 'Show all ' + choreRows.length + ' chores'}</button>}
              </> : <p className="widget-empty">No chores due today.</p>}
            </Widget>
          case 'pantry':
            return <Widget key={widget.id} widget={widget} open={() => go('pantry')}>
              <div className="widget-stat"><strong>{low.length}</strong><span>low stock</span></div>
              <p className="widget-note">{low.length ? previewNames(low) : state.pantry.length ? 'Stock looks good' : 'No pantry items'}</p>
            </Widget>
          case 'shopping':
            return <Widget key={widget.id} widget={widget} open={() => go('shopping')} action={<Progress value={checked} total={state.groceries.length} label="Shopping items checked" compact />}>
              <div className="widget-stat"><strong>{state.groceries.length - checked}</strong><span>to buy</span></div>
              <p className="widget-note">{state.lists.length ? state.lists.length + (state.lists.length === 1 ? ' shopping list' : ' shopping lists') : 'No shopping lists'}</p>
            </Widget>
          case 'calendar':
            return <Widget key={widget.id} widget={widget} open={() => go('calendar')}>
              {upcoming.length ? <ul className="widget-agenda">{upcoming.slice(0, 2).map(({ collection, item, date }) =>
                <li key={collection + ':' + item.id}><button onClick={() => edit(collection, item)}><time dateTime={date}>{date === today ? 'Today' : formatDay(date)}</time><span>{item.name}</span></button></li>
              )}</ul> : <p className="widget-empty">Nothing coming up.</p>}
            </Widget>
          case 'dog':
            return <Widget key={widget.id} widget={widget} open={() => go('dog')}><ScheduleSummary tasks={pets} today={today} empty="No care scheduled" /></Widget>
          case 'maintenance':
            return <Widget key={widget.id} widget={widget} open={() => go('maintenance')}><ScheduleSummary tasks={appliances} today={today} empty="No service scheduled" /></Widget>
          case 'attention':
            return <Widget key={widget.id} widget={widget}>
              {attention.length ? <><ul className="command-chores">{(showAllDue ? attention : attention.slice(0, 2)).map(({ collection, task }) =>
                <QuickTask key={collection + ':' + task.id} task={task} today={today} done={false} complete={() => complete(collection, task)} edit={() => edit(collection, task)} />)}
              </ul>{attention.length > 2 && <button className="command-more" onClick={() => setShowAllDue(!showAllDue)}>{showAllDue ? 'Show fewer tasks' : 'Show all ' + attention.length + ' tasks'}</button>}</> : <p className="widget-empty">No pet care or maintenance due.</p>}
            </Widget>
        }
      })}
      {!visible.length && <div className="command-widget widget-wide widget-placeholder">
        <p>All dashboard widgets are hidden.</p><button className="secondary" onClick={customize}>Show widgets</button>
      </div>}
    </div>
  </>
}

function Widget({ widget, wide, action, open, children }: {
  widget: WidgetPreference; wide?: boolean; action?: ReactNode; open?: () => void; children: ReactNode
}) {
  const { label } = widgetDefinitions[widget.id]
  return <section className={'command-widget' + (wide ? ' widget-wide' : '')} data-color={widget.color} aria-labelledby={'widget-' + widget.id}>
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

function previewNames(items: { name: string }[]) {
  return items.length > 2 ? items[0].name + ' +' + (items.length - 1) : items.map(item => item.name).join(' · ')
}

function ScheduleSummary({ tasks, today, empty }: { tasks: Schedule[]; today: string; empty: string }) {
  const due = tasks.filter(task => task.date <= today)
  const next = [...tasks].sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!next) return <p className="widget-empty">{empty}</p>
  return <>
    <div className="widget-stat">{due.length ? <><strong>{due.length}</strong><span>due</span></> :
      <strong className="widget-next"><time dateTime={next.date}>{formatDay(next.date)}</time></strong>}</div>
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

function QuickTask({ task, today, done, complete, edit }: {
  task: Schedule; today: string; done: boolean; complete: () => boolean; edit: () => void
}) {
  return <li className="command-task" data-done={done}>
    <button className="quick-check" type="button" aria-label={done ? task.name + ' completed' : 'Complete ' + task.name}
      aria-disabled={done || undefined} onClick={() => { if (!done) complete() }}><Check size={16} aria-hidden="true" /></button>
    <button className="quick-edit" type="button" aria-label={'Edit ' + task.name} onClick={edit}>
      <span>{task.name}</span>{!done && task.date < today && <small>Overdue</small>}
    </button>
  </li>
}

export function CustomizeDashboard({ preferences, onSave, onClose }: {
  preferences: DashboardPreferences; onSave: (value: DashboardPreferences) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(preferences)
  const [section, setSection] = useState<'Layout' | 'Categories' | 'Themes'>('Layout')
  const [feedback, setFeedback] = useState('')
  function updateWidget(id: WidgetId, changes: Partial<Omit<WidgetPreference, 'id'>>) {
    setDraft(previous => ({ ...previous, widgets: previous.widgets.map(widget => widget.id === id ? { ...widget, ...changes } : widget) }))
  }
  function move(id: WidgetId, offset: -1 | 1) {
    const widgets = moveWidget(draft.widgets, id, offset)
    if (widgets === draft.widgets) return
    setDraft({ ...draft, widgets })
    setFeedback(widgetDefinitions[id].label + ' moved to position ' + (widgets.findIndex(widget => widget.id === id) + 1) + '.')
  }
  return <div className="customizer">
    <nav className="customizer-sections" aria-label="Customization sections">
      {(['Layout', 'Categories', 'Themes'] as const).map(tab =>
        <button key={tab} type="button" aria-pressed={section === tab} onClick={() => { setSection(tab); setFeedback('') }}>{tab}</button>)}
    </nav>
    {section === 'Layout' && <ol className="customizer-list" aria-label="Widget order">
      {draft.widgets.map((widget, index) => {
        const name = widgetDefinitions[widget.id].label
        return <li key={widget.id} className="customizer-row">
          <CategoryIcon widget={widget} />
          <label className="widget-toggle"><span>{name}</span><input type="checkbox" checked={widget.visible} aria-label={'Show ' + name}
            onChange={event => updateWidget(widget.id, { visible: event.target.checked })} /></label>
          <button className="icon-button" aria-label={'Move ' + name + ' up'} aria-disabled={index === 0} onClick={() => move(widget.id, -1)}><ChevronUp size={18} /></button>
          <button className="icon-button" aria-label={'Move ' + name + ' down'} aria-disabled={index === draft.widgets.length - 1} onClick={() => move(widget.id, 1)}><ChevronDown size={18} /></button>
        </li>
      })}
    </ol>}
    {section === 'Categories' && <ul className="customizer-list" aria-label="Category appearance">
      {draft.widgets.map(widget => {
        const name = widgetDefinitions[widget.id].label
        return <li key={widget.id} className="customizer-category">
          <div><CategoryIcon widget={widget} /><strong>{name}</strong></div>
          <label>Color<select value={widget.color} aria-label={name + ' color'} onChange={event => updateWidget(widget.id, { color: event.target.value as WidgetPreference['color'] })}>
            {Object.entries(categoryColors).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label>Icon<select value={widget.icon} aria-label={name + ' icon'} onChange={event => updateWidget(widget.id, { icon: event.target.value as IconId })}>
            {Object.entries(iconLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select></label>
        </li>
      })}
    </ul>}
    {section === 'Themes' && <fieldset className="theme-options">
      <legend className="sr-only">Visual theme</legend>
      {(Object.keys(themeOptions) as DashboardPreferences['theme'][]).map(theme => {
        const option = themeOptions[theme]
        return <label key={theme} className="theme-option">
          <input type="radio" name="theme" value={theme} checked={draft.theme === theme} onChange={() => setDraft({ ...draft, theme })} />
          <span><strong>{option.label}</strong><small>{option.description}</small></span>
          <span className="theme-swatches" aria-hidden="true">{option.swatches.map(color => <i key={color} style={{ backgroundColor: color }} />)}</span>
        </label>
      })}
    </fieldset>}
    <p className="sr-only" role="status">{feedback}</p>
    <div className="dialog-actions">
      <button className="text-button customizer-reset" onClick={() => { setDraft(defaultPreferences()); setFeedback('Defaults loaded. Save to apply them.') }}>Reset</button>
      <button className="secondary" onClick={onClose}>Cancel</button>
      <button className="primary" onClick={() => onSave(draft)}>Save dashboard</button>
    </div>
  </div>
}
