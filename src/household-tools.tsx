import { useState, type FormEvent } from 'react'
import { Check, Heart, Minus, Plus } from 'lucide-react'
import { CategoryIcon } from './dashboard'
import { categoryColors, iconLabels, type CategoryColor, type IconId } from './dashboard-preferences'
import { formatDay, offsetDay, type Category, type Pantry, type Routine, type Schedule } from './data'
import { expirationStatus, isLowStock, quantityAfter } from './inventory'
import { canComplete, canUndo, dueDate, isActive, type TaskAction } from './recurrence'

export function CategorySelect({ categories, value, name = 'categoryId' }: { categories: Category[]; value?: string; name?: string }) {
  return <label>Category<select name={name} defaultValue={value ?? ''}>
    <option value="">Uncategorized</option>
    {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
  </select></label>
}

export function CategoryTag({ category }: { category?: Category }) {
  if (!category) return null
  return <span className="category-tag" data-color={category.color}><CategoryIcon widget={category} />{category.name}</span>
}

export function CategoryEditor({ category, save, remove, close }: {
  category?: Category; save: (category: Category) => void; remove: () => void; close: () => void
}) {
  return <form onSubmit={event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (name) save({ id: category?.id ?? crypto.randomUUID(), name,
      color: form.get('color') as CategoryColor, icon: form.get('icon') as IconId })
  }}>
    <label>Name<input name="name" required pattern=".*\S.*" maxLength={80} defaultValue={category?.name} /></label>
    <div className="form-grid">
      <label>Color<select name="color" defaultValue={category?.color ?? 'slate'}>
        {Object.entries(categoryColors).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
      <label>Icon<select name="icon" defaultValue={category?.icon ?? 'tag'}>
        {Object.entries(iconLabels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select></label>
    </div>
    <div className="dialog-actions">
      {category && <button type="button" className="danger" onClick={remove}>Delete category</button>}
      <button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save category</button>
    </div>
  </form>
}

export function RoutineEditor({ routine, chores, categories, save, remove, close }: {
  routine?: Routine; chores: Schedule[]; categories: Category[]
  save: (routine: Routine) => void; remove: () => void; close: () => void
}) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const choreIds = form.getAll('chore').map(String)
    if (!name || !choreIds.length) { setError('Enter a name and choose at least one chore.'); return }
    const checkoffs = Object.fromEntries(Object.entries(routine?.checkoffs ?? {}).filter(([id]) => choreIds.includes(id)))
    save({ id: routine?.id ?? crypto.randomUUID(), name, choreIds, checkoffs, categoryId: String(form.get('categoryId')) || undefined })
  }

  return <form onSubmit={submit}>
    <label>Name<input name="name" required maxLength={100} defaultValue={routine?.name} /></label>
    <CategorySelect categories={categories} value={routine?.categoryId} />
    <fieldset className="routine-choices">
      <legend>Chores</legend>
      {chores.length ? chores.map(chore => <label className="grocery" key={chore.id}>
        <input type="checkbox" name="chore" value={chore.id} defaultChecked={routine?.choreIds.includes(chore.id)} />{chore.name}
      </label>) : <p>Add a chore before creating a routine.</p>}
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="dialog-actions">
      {routine && <button type="button" className="danger" onClick={remove}>Delete routine</button>}
      <button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save routine</button>
    </div>
  </form>
}

export function routineChores(routine: Routine, chores: Schedule[]) {
  return routine.choreIds.flatMap(id => {
    const task = chores.find(chore => chore.id === id)
    return task ? [task] : []
  })
}

export function RoutineProgress({ routine, chores, today, complete }: {
  routine: Routine; chores: Schedule[]; today: string; complete: (chore: Schedule) => void
}) {
  const tasks = routineChores(routine, chores)
  const isDone = (task: Schedule) => task.lastDone === today || routine.checkoffs?.[task.id] === today
  const done = tasks.filter(isDone).length
  return <div className="routine-progress">
    <div><progress aria-label={routine.name + ' progress'} value={done} max={tasks.length || 1} /><span>{done}/{tasks.length} complete today</span></div>
    {tasks.map(task => <label key={task.id} className="grocery">
      <input type="checkbox" checked={isDone(task)} disabled={isDone(task)} onChange={() => complete(task)} />
      {task.name}
    </label>)}
    {!tasks.length && <p>No chores in this routine.</p>}
  </div>
}

export function TaskActivity({ task, today, action, undo }: {
  task: Schedule; today: string; action: (action: TaskAction, until?: string) => void; undo: () => void
}) {
  const [snooze, setSnooze] = useState(() => offsetDay(dueDate(task) > today ? dueDate(task) : today, 1))
  return <div className="task-activity">
    {isActive(task) && <form onSubmit={event => { event.preventDefault(); action('snooze', snooze) }}>
      <label>Snooze until<input type="date" required value={snooze} onChange={event => setSnooze(event.target.value)}
        min={offsetDay(dueDate(task) > today ? dueDate(task) : today, 1)} max="9900-12-31" /></label>
      <div className="task-actions">
        <button className="secondary" type="submit">Snooze</button>
        <button className="secondary" type="button" onClick={() => action('skip')}>Skip occurrence</button>
      </div>
    </form>}
    {canUndo(task) && <button className="secondary" onClick={undo}>Undo last action</button>}
    <h3>History</h3>
    {task.history?.length ? <ol className="history-list">{[...task.history].reverse().map((entry, index) =>
      <li key={index}><strong>{entry.action === 'complete' ? 'Completed' : entry.action === 'skip' ? 'Skipped' : 'Snoozed'}{entry.undone && ' · Undone'}</strong>
        <small>{formatDay(entry.day, { dateStyle: 'medium' })}{entry.after.snoozedUntil && ' until ' + formatDay(entry.after.snoozedUntil)}</small></li>)}</ol>
      : <p>{task.lastDone ? 'Last completed ' + formatDay(task.lastDone, { dateStyle: 'medium' }) : 'No activity recorded.'}</p>}
  </div>
}

export function InventoryRow({ item, category, today, save, edit, add }: {
  item: Pantry; category?: Category; today: string; save: (item: Pantry) => void; edit: () => void; add: () => void
}) {
  const expiry = expirationStatus(item, today)
  return <div className="inventory-row">
    <div className="record-info">
      <button className="inventory-name" onClick={edit} aria-label={'Edit ' + item.name}>{item.name}</button>
      <small>{item.unit || 'on hand'} · Low at {item.threshold}</small>
      {item.expires && <small>{expiry ?? 'Expires ' + formatDay(item.expires)}</small>}
      {category && <CategoryTag category={category} />}
    </div>
    <button className="icon-button favorite-button" aria-label={'Favorite ' + item.name} aria-pressed={!!item.favorite}
      onClick={() => save({ ...item, favorite: !item.favorite })}><Heart size={19} fill={item.favorite ? 'currentColor' : 'none'} /></button>
    <div className="quantity-control" aria-label={item.name + ' quantity'}>
      <button className="icon-button" disabled={!item.quantity} aria-label={'Decrease ' + item.name} onClick={() => save({ ...item, quantity: quantityAfter(item, -1) })}><Minus size={17} /></button>
      <output aria-label={item.name + ' on hand'}>{item.quantity}</output>
      <button className="icon-button" aria-label={'Increase ' + item.name} onClick={() => save({ ...item, quantity: quantityAfter(item, 1) })}><Plus size={17} /></button>
    </div>
    {isLowStock(item) && <button className="secondary inventory-shop" aria-label={'Add ' + item.name + ' to shopping'} onClick={add}><Plus size={16} />Shopping</button>}
  </div>
}

export function TaskCheck({ task, today, complete }: { task: Schedule; today: string; complete: () => void }) {
  return <button className="check-button" disabled={!canComplete(task, today)} aria-label={'Complete ' + task.name} onClick={complete}><Check size={17} /></button>
}
