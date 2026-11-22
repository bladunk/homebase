import { useState } from 'react'
import { CalendarDays, Check, Clock, Ellipsis, Medal, Plus } from 'lucide-react'
import { formatDay, type Schedule } from './data'
import { goalLabels, homeProgress, type Goal } from './home-score'
import { canComplete, dueDate } from './recurrence'
import { estimatedMinutes, onDemand, type PlanSettings, type SmartPreferences } from './smart-plan'
import { PlannerInputs } from './smart-setup'
import { orderDue, weekPlan, type TaskEntry } from './weekly-plan'

const collections = { chores: 'Chores', medication: 'Medication', vet: 'Vet care', maintenance: 'Maintenance' }

export function TodayView({ entries, today, settings, saveSettings, complete, activity, edit, add }: {
  entries: TaskEntry[]; today: string; settings: PlanSettings; saveSettings: (settings: PlanSettings) => boolean
  complete: (entry: TaskEntry) => boolean; activity: (entry: TaskEntry) => void; edit: (entry: TaskEntry) => void; add: () => void
}) {
  const due = entries.filter(({ task }) => !onDemand(task) && dueDate(task) <= today).sort((a, b) => orderDue(a, b, today))
  const plan = weekPlan(entries, today, settings)
  const manual = entries.filter(({ task }) => onDemand(task))
  const planned = plan.days[0].minutes
  return <div className="today-stack">
    <section className="smart-panel today-summary">
      <div><Clock size={18} /><strong>{planned} min</strong><span>planned today</span></div>
      <div><CalendarDays size={18} /><strong>{settings.budget} min</strong><span>daily budget</span></div>
      <div><Check size={18} /><strong>{due.length}</strong><span>due or overdue</span></div>
    </section>
    <section className="smart-panel">
      <div className="smart-heading"><h2>Due now</h2><button className="secondary" onClick={add}><Plus size={16} /> New chore</button></div>
      {due.length ? due.map(entry => {
        const { task } = entry
        return <TodayTask key={entry.collection + task.id} entry={entry} today={today} complete={complete} edit={edit} activity={activity}
          badge={dueDate(task) < today ? 'Overdue' : 'Today'} />
      }) : <p className="empty">You’re caught up on scheduled tasks.</p>}
    </section>
    {!!manual.length && <details className="smart-panel"><summary>As-needed tasks ({manual.length})</summary>
      {manual.map(entry => <TodayTask key={entry.collection + entry.task.id} entry={entry} today={today}
        complete={complete} edit={edit} activity={activity} badge={entry.task.lastDone === today ? 'Logged today' : undefined} />)}
    </details>}
    <section className="smart-panel">
      <div className="smart-heading"><h2>Suggested week</h2></div>
      <p className="planner-note">Suggestions use saved due dates. Fixed tasks stay put, and forecasts assume completion on time.</p>
      <div className="plan-days">{plan.days.map(day => <details key={day.date}>
        <summary><strong>{day.date === today ? 'Today' : formatDay(day.date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
          <span>{day.rest ? 'Rest day · ' : ''}{day.minutes} min{day.minutes > settings.budget ? ' · Over budget' : ''}</span></summary>
        {day.tasks.length ? <ul>{day.tasks.map(row => <li key={row.collection + ':' + row.task.id + ':' + row.due}>
          <span>{row.task.name}</span><small>{row.minutes} min{row.fixed ? ' · Fixed' : ''}{row.projected ? ' · Forecast' : ''}</small>
        </li>)}</ul> : <p className="planner-note">No tasks planned.</p>}
      </details>)}</div>
      {!!plan.unplaced.length && <details className="unplaced"><summary>{plan.unplaced.length} outside available planning days</summary>
        <ul>{plan.unplaced.map(row => <li key={row.collection + ':' + row.task.id + ':' + row.due}>{row.task.name} · {formatDay(row.due)}</li>)}</ul>
      </details>}
    </section>
    <details className="smart-panel plan-settings"><summary>Scheduling preferences</summary>
      <PlannerSettings key={JSON.stringify(settings)} settings={settings} save={saveSettings} />
    </details>
  </div>
}

function TodayTask({ entry, today, complete, edit, activity, badge }: {
  entry: TaskEntry; today: string; complete: (entry: TaskEntry) => boolean; edit: (entry: TaskEntry) => void
  activity: (entry: TaskEntry) => void; badge?: string
}) {
  return <div className="today-task record-row">
    <button className="check-button" disabled={!canComplete(entry.task, today)} onClick={() => complete(entry)} aria-label={'Complete ' + entry.task.name}><Check size={17} /></button>
    <button className="today-task-title" onClick={() => edit(entry)} aria-label={'Edit ' + entry.task.name}>
      <strong>{entry.task.name}</strong><small>{collections[entry.collection]} · {estimatedMinutes(entry.task)} min
        {entry.task.plan?.priority === 'critical' && ' · Time-sensitive'}</small>
    </button>
    {badge && <span className={'pill' + (badge === 'Overdue' ? ' warning' : '')}>{badge}</span>}
    <button className="icon-button" aria-label={'Activity for ' + entry.task.name} onClick={() => activity(entry)}><Ellipsis size={19} /></button>
  </div>
}

function PlannerSettings({ settings, save }: { settings: PlanSettings; save: (settings: PlanSettings) => boolean }) {
  const [draft, setDraft] = useState(settings)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [feedback, setFeedback] = useState('')
  return <form className="smart-form" onSubmit={event => {
    event.preventDefault()
    if (!!start !== !!end || (start && end < start)) { setFeedback('Enter a start and end date for your break.'); return }
    const current = draft.breaks ?? []
    const breaks = start && !current.some(range => range.start === start && range.end === end) ? [...current, { start, end }] : current
    if (save({ ...draft, breaks })) {
      setStart('')
      setEnd('')
      setFeedback('Scheduling preferences saved.')
    } else setFeedback('Could not save scheduling preferences.')
  }}>
    <PlannerInputs planner={draft} update={setDraft} />
    <fieldset className="setup-fieldset"><legend>Regular rest days</legend><div className="setup-toggles">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, day) => <label key={name}>
        <input type="checkbox" checked={draft.restDays.includes(day)}
          onChange={event => setDraft({ ...draft, restDays: event.target.checked ? [...draft.restDays, day] : draft.restDays.filter(value => value !== day) })} />{name}
      </label>)}
    </div></fieldset>
    <fieldset className="setup-fieldset"><legend>Break for illness, vacation, or rest</legend><div className="smart-form-grid">
      <label>Start<input type="date" min="1900-01-01" max="9900-12-31" value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>End<input type="date" min={start || '1900-01-01'} max="9900-12-31" value={end} onChange={event => setEnd(event.target.value)} /></label>
    </div>
      {!!draft.breaks?.length && <ul className="break-list">{draft.breaks.map(({ start, end }, index) => <li key={start + end + index}>
        <span>{formatDay(start, { dateStyle: 'medium' })} – {formatDay(end, { dateStyle: 'medium' })}</span>
        <button className="text-button" type="button" onClick={() => setDraft({ ...draft, breaks: draft.breaks?.filter((_, position) => position !== index) })}>Remove</button>
      </li>)}</ul>}
    </fieldset>
    {!!feedback && <p role="status">{feedback}</p>}
    <div><button className="primary" type="submit">Save scheduling preferences</button></div>
  </form>
}

export function ProgressView({ chores, today, smart, save, settings }: {
  chores: Schedule[]; today: string; smart: SmartPreferences; save: (preferences: SmartPreferences['progress']) => boolean; settings: () => void
}) {
  const { enabled, goal } = smart.progress
  const progress = homeProgress(chores, today, goal, smart.planner)
  const current = progress.current
  const max = Math.max(1, ...progress.history.map(row => row.completions))
  return <div className="today-stack">
    <section className="smart-panel">
      <div className="smart-heading"><h2>Personal progress</h2>
        <button className={enabled ? 'secondary' : 'primary'} aria-pressed={enabled}
          onClick={() => save({ ...smart.progress, enabled: !enabled })}>{enabled ? 'Turn off' : 'Turn on progress'}</button></div>
      <p className="planner-note">Follow your household’s chore history at a pace you choose.</p>
      {enabled && <div className="progress-options">
        <label>Recommended pace<select value={goal} onChange={event => save({ enabled, goal: Number(event.target.value) as Goal })}>
          {(Object.entries(goalLabels)).map(([key, label]) => <option key={key} value={key}>{label} · {key} days/week</option>)}
        </select></label>
        <button className="secondary" onClick={settings}>Set rest days or a break</button>
      </div>}
    </section>
    {enabled && <>
      <section className="score-grid">
        <div className="smart-panel score-tile"><small>Home Score</small><strong>{current.score ?? 'Paused'}</strong><span>{current.score === null ? 'No goal this week' : 'out of 100 this week'}</span></div>
        <div className="smart-panel score-tile"><small>Experience</small><strong>{progress.xp} XP</strong><span>Level {progress.level}</span></div>
        <div className="smart-panel score-tile"><small>Weekly streak</small><strong>{progress.streak}</strong><span>{progress.streak === 1 ? 'week' : 'weeks'} at your goal</span></div>
        <div className="smart-panel score-tile"><small>Weekly challenge</small><strong>{current.target ? current.active + '/' + current.target : 'Paused'}</strong>
          <span>{current.target && current.active >= current.target ? 'Challenge complete' : 'active days'}</span></div>
      </section>
      <section className="smart-panel">
        <div className="smart-heading"><h2><Medal size={20} /> Badges</h2></div>
        {progress.badges.length ? <ul className="score-badges">{progress.badges.map(badge => <li key={badge}>{badge}</li>)}</ul> :
          <p className="empty">Finish a chore to earn your first badge.</p>}
      </section>
      <section className="smart-panel">
        <div className="smart-heading"><h2>Eight-week history</h2></div>
        <div className="history-charts">
          <HistoryChart name="Home Score" rows={progress.history.map(row => ({ date: row.monday, value: row.score }))} max={100} />
          <HistoryChart name="Chores completed" rows={progress.history.map(row => ({ date: row.monday, value: row.completions }))} max={max} />
        </div>
      </section>
      <details className="smart-panel formula-panel"><summary>How progress is calculated</summary>
        <p>The weekly target is the smaller of your chosen pace and the number of days available after rest days and any break. Each available day with a completed chore counts once. Home Score is the percentage of that personal target reached, rounded and capped at 100.</p>
        <p>Each chore earns 10 XP per day and every 100 XP adds a level. Undoing a completion removes its credit. The streak counts weeks at your target. Break weeks and fully paused weeks can carry it forward. The current week can still be in progress.</p>
        <p>Charts use retained chore history and your current pace and rest preferences. The comparison is with your selected schedule.</p>
      </details>
    </>}
  </div>
}

function HistoryChart({ name, rows, max }: { name: string; rows: { date: string; value: number | null }[]; max: number }) {
  return <figure className="history-chart"><figcaption>{name}</figcaption><ol>{rows.map(row =>
    <li key={row.date}>
      <time dateTime={row.date}>{formatDay(row.date)}</time>
      <span className="history-chart-track" aria-hidden="true"><i style={{ width: (row.value ?? 0) * 100 / max + '%' }} /></span>
      <strong>{row.value ?? 'Paused'}</strong>
    </li>)}</ol></figure>
}
