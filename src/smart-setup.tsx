import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, BookOpen, CalendarDays, Check, Clock, Search, Sparkles } from 'lucide-react'
import { cadences, choreCategories, choreLibrary, conditions, references, type Cadence, type ChoreTemplate, type Condition } from './chore-library'
import { isDate, type Schedule } from './data'
import { cleaningModes, defaultAnswers, homeTypes, isDuplicate, starterSuggestions, styles, type Answers, type PlanSettings, type Suggestion } from './smart-plan'

const equipment: Condition[] = ['dishwasher', 'washer', 'dryer', 'coffee', 'keurig', 'oven', 'microwave', 'hvac', 'robot', 'vehicle', 'yard', 'exterior', 'fireplace']
const household: Condition[] = ['children', 'baby', 'dog', 'cat']
const care: Condition[] = ['bottles', 'pump', 'diaper', 'wetFood']
const stepNames = ['Household', 'Equipment', 'Preferences', 'Review']

function ToggleGroup({ title, options, values, change }: { title: string; options: Condition[]; values: Condition[]; change: (key: Condition) => void }) {
  if (!options.length) return null
  return <fieldset className="setup-fieldset">
    <legend>{title}</legend>
    <div className="setup-toggles">{options.map(key =>
      <label key={key}><input type="checkbox" checked={values.includes(key)} onChange={() => change(key)} /><span>{conditions[key]}</span></label>)}</div>
  </fieldset>
}

export function PlannerInputs({ planner, update }: { planner: PlanSettings; update: (plan: PlanSettings) => void }) {
  return <div className="smart-form-grid">
    <label>Daily chore budget (minutes)<input type="number" required min={5} max={240} step={1} value={planner.budget || ''}
      onChange={event => update({ ...planner, budget: Number(event.target.value) })} /></label>
    <label>Scheduling style<select value={planner.style} onChange={event => update({ ...planner, style: event.target.value as PlanSettings['style'] })}>
      {Object.entries(styles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
    </select></label>
  </div>
}

export function SetupWizard({ existing, saved, initialPlanner, today, finish, cancel }: {
  existing: Schedule[]; saved?: Answers; initialPlanner: PlanSettings; today: string
  finish: (rows: Suggestion[], answers: Answers, planner: PlanSettings) => boolean; cancel: () => void
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(saved ?? defaultAnswers)
  const [planner, setPlanner] = useState(initialPlanner)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [filter, setFilter] = useState('selected')
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  function moveTo(next: number) {
    setStep(next)
    setError('')
  }
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step])

  function toggle(key: Condition) {
    setAnswers(previous => ({ ...previous, kit: previous.kit.includes(key) ? previous.kit.filter(item => item !== key) : [...previous.kit, key] }))
  }

  function nextStep() {
    if (step === 2) {
      setSuggestions(starterSuggestions(answers, planner, existing, today))
      setFilter('selected')
    }
    moveTo(step + 1)
  }

  function updateSuggestion(id: string, changes: Partial<Suggestion>) {
    setSuggestions(previous => previous.map(item => item.template.id === id ? { ...item, ...changes } : item))
  }

  const checked = suggestions.filter(item => item.enabled && !isDuplicate(item.template, existing))
  const included = suggestions.filter(item => filter === 'all' || (filter === 'selected' ? item.enabled : item.template.category === filter))
  const duplicateCount = suggestions.filter(item => isDuplicate(item.template, existing)).length
  const visibleCare = care.filter(item => (item === 'wetFood' ? answers.kit.includes('dog') || answers.kit.includes('cat') : answers.kit.includes('baby')))

  return <section className="setup-shell">
    <ol className="setup-steps" aria-label="Setup steps">
      {stepNames.map((name, index) => <li key={name} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? <Check size={13} /> : index + 1}</span>{name}
      </li>)}
    </ol>
    <div className="smart-panel setup-panel">
      <header className="smart-heading"><h2 ref={heading} tabIndex={-1}>
        {['Who lives here?', 'What do you look after?', 'How do you like to plan?', 'Review your chore plan'][step]}
      </h2></header>
      {step < 3 ? <form className="smart-form" onSubmit={event => { event.preventDefault(); nextStep() }}>
        {step === 0 && <>
          <label>Home type<select value={answers.home} onChange={event => setAnswers({ ...answers, home: event.target.value as Answers['home'] })}>
            {Object.entries(homeTypes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select></label>
          <div className="smart-form-grid room-grid">
            {(['bedrooms', 'bathrooms', 'occupants'] as const).map(key => <label key={key}>{key}
              <input type="number" min={key === 'occupants' ? 1 : 0} max={key === 'occupants' ? 30 : 20} required
                value={answers[key]} onChange={event => setAnswers({ ...answers, [key]: Number(event.target.value) })} /></label>)}
          </div>
          <ToggleGroup title="Children and pets" options={household} values={answers.kit} change={toggle} />
          <ToggleGroup title="Care supplies" options={visibleCare} values={answers.kit} change={toggle} />
        </>}
        {step === 1 && <>
          <ToggleGroup title="Flooring" options={['hard', 'carpet']} values={answers.kit} change={toggle} />
          <ToggleGroup title="Appliances, vehicles, and upkeep" options={equipment} values={answers.kit} change={toggle} />
        </>}
        {step === 2 && <>
          <label>Cleaning preference<select value={answers.cleaning} onChange={event => setAnswers({ ...answers, cleaning: event.target.value as Answers['cleaning'] })}>
            {Object.entries(cleaningModes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
          </select></label>
          <PlannerInputs planner={planner} update={setPlanner} />
          <p className="smart-hint">The budget guides flexible chores. Fixed and time-sensitive tasks can exceed it.</p>
        </>}
        <WizardActions step={step} back={() => moveTo(step - 1)} cancel={cancel}>
          <button className="primary" type="submit">{step === 2 ? 'Preview chores' : 'Continue'}</button>
        </WizardActions>
      </form> : <form className="smart-form" onSubmit={event => {
        event.preventDefault()
        if (checked.some(row => !Number.isInteger(row.minutes) || row.minutes < 1 || row.minutes > 600 ||
          (row.cadence !== 'afterUse' && row.cadence !== 'asNeeded' && !isDate(row.firstDue)))) {
          setError('Review the duration and due date for each selected chore.')
          return
        }
        if (!finish(checked, answers, planner)) setError('Could not save the plan. Check storage and try again.')
      }}>
        <div className="setup-review-head">
          <div aria-live="polite"><strong>{checked.length} selected</strong><p className="smart-hint">{duplicateCount ? duplicateCount + ' existing matches will be kept.' : 'Open any task to adjust its timing or duration.'}</p></div>
          <label>Show<select value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="selected">Selected</option><option value="all">All household matches</option>
            {choreCategories.map(category => <option key={category}>{category}</option>)}
          </select></label>
        </div>
        <div className="suggestion-list">{included.map(item => {
          const duplicate = isDuplicate(item.template, existing)
          return <div className="suggestion" key={item.template.id}>
            <label className="suggestion-toggle"><input type="checkbox" disabled={duplicate} checked={item.enabled && !duplicate}
              onChange={event => updateSuggestion(item.template.id, { enabled: event.target.checked })} /><span><strong>{item.template.name}</strong>
                <small>{item.template.category} · {duplicate ? 'Already in HomeBase' : cadences[item.cadence] + ' · ' + item.minutes + ' min'}</small></span></label>
            <details><summary>Task details</summary>
              <TemplateDetails template={item.template} />
              {!duplicate && <div className="smart-form-grid suggestion-fields">
                <label>Recurrence<select value={item.cadence} disabled={item.template.priority === 'critical' && item.template.cadence === 'afterUse'}
                  onChange={event => updateSuggestion(item.template.id, { cadence: event.target.value as Cadence })}>
                  {Object.entries(cadences).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
                </select></label>
                <label>Minutes<input type="number" min={1} max={600} step={1} required disabled={!item.enabled} value={item.minutes}
                  onChange={event => updateSuggestion(item.template.id, { minutes: Number(event.target.value) })} /></label>
                {item.cadence !== 'afterUse' && item.cadence !== 'asNeeded' && <label>First due date<input type="date" required min="1900-01-01" max="9900-12-31"
                  disabled={!item.enabled} value={item.firstDue} onChange={event => updateSuggestion(item.template.id, { firstDue: event.target.value })} /></label>}
              </div>}
            </details>
          </div>
        })}</div>
        {!included.length && <p className="smart-hint">No tasks in this view. Choose another filter to review suggestions.</p>}
        {error && <p role="alert" className="message error">{error}</p>}
        <WizardActions step={step} back={() => moveTo(step - 1)} cancel={cancel}>
          <button className="primary" type="submit">{checked.length ? 'Import ' + checked.length + (checked.length === 1 ? ' chore' : ' chores') : 'Save preferences'}</button>
        </WizardActions>
      </form>}
    </div>
  </section>
}

function WizardActions({ step, back, cancel, children }: { step: number; back: () => void; cancel: () => void; children: ReactNode }) {
  return <div className="wizard-actions">
    {step > 0 ? <button className="secondary" type="button" onClick={back}><ArrowLeft size={16} /> Back</button> :
      <button className="text-button" type="button" onClick={cancel}>Exit setup</button>}
    {children}
  </div>
}

export function TemplateDetails({ template }: { template: ChoreTemplate }) {
  return <div className="template-details">
    <p>{template.instructions}</p>
    <dl>
      <div><dt>Suggested timing</dt><dd>{cadences[template.cadence]} · {template.references.some(ref => ref.supports === 'cadence') ? 'Source guidance' : 'HomeBase default'}</dd></div>
      <div><dt>Active time</dt><dd>{template.minutes} min estimated by HomeBase</dd></div>
      <div><dt>Priority</dt><dd>{template.priority === 'critical' ? 'Time-sensitive · fixed timing' : template.priority}</dd></div>
      {(!!template.conditions.length) && <div><dt>Applies to</dt><dd>{template.conditions.map(key => conditions[key]).join(', ')}</dd></div>}
    </dl>
    {!!template.references.length && <ul className="source-list">{template.references.map((ref, index) => {
      const source = references[ref.id]
      return <li key={ref.id + index}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}</a>
        <small>{ref.note ?? ({ cadence: 'Timing guidance', method: 'Cleaning or care method', context: 'Background' }[ref.supports])}</small>
      </li>
    })}</ul>}
  </div>
}

export function ChoreLibrary({ existing, today, add, setup }: {
  existing: Schedule[]; today: string; add: (suggestion: Suggestion) => void; setup: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState(20)
  const matches = choreLibrary.filter(template => (!category || template.category === category) &&
    (template.name + ' ' + template.category + ' ' + template.aliases.join(' ')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className="smart-panel library-panel">
    <div className="smart-heading"><h2><BookOpen size={20} /> {choreLibrary.length} chore templates</h2>
      <button className="secondary" onClick={setup}><Sparkles size={16} /> Guided setup</button></div>
    <div className="smart-form-grid library-filters">
      <label>Search templates<input type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(20) }} placeholder="e.g. laundry" /></label>
      <label>Category<select value={category} onChange={event => { setCategory(event.target.value); setLimit(20) }}>
        <option value="">All categories</option>{choreCategories.map(name => <option key={name}>{name}</option>)}
      </select></label>
    </div>
    {matches.slice(0, limit).map(template => {
      const added = isDuplicate(template, existing)
      return <article className="library-row" key={template.id}>
        <div><strong>{template.name}</strong><small>{template.category} · {cadences[template.cadence]} · {template.minutes} min</small></div>
        <button className="secondary" disabled={added} aria-label={added ? template.name + ' already added' : 'Add ' + template.name} onClick={() =>
          add({ template, firstDue: today, minutes: template.minutes, cadence: template.cadence, enabled: true })}>{added ? 'Added' : 'Add'}</button>
        <details><summary>Instructions and sources</summary><TemplateDetails template={template} /></details>
      </article>
    })}
    {!matches.length && <p className="empty">No templates match your search.</p>}
    {matches.length > limit && <button className="secondary library-more" onClick={() => setLimit(limit + 20)}>Show more templates</button>}
  </section>
}

export function StartHere({ start, dismiss }: { start: () => void; dismiss: () => void }) {
  return <section className="setup-callout">
    <span className="setup-callout-icon"><Sparkles size={23} /></span>
    <div><h2>Set up your household</h2><p>Answer a few questions and preview chores that fit your home.</p>
      <div className="setup-callout-actions"><button className="primary" onClick={start}>Start setup</button><button className="text-button" onClick={dismiss}>Maybe later</button></div>
    </div>
  </section>
}

export function SmartShortcuts({ today, library, progress }: { today: () => void; library: () => void; progress?: () => void }) {
  return <div className="smart-shortcuts">
    <button className="secondary" onClick={today}><CalendarDays size={17} /> Today</button>
    <button className="secondary" onClick={library}><BookOpen size={17} /> Chore library</button>
    {progress && <button className="secondary" onClick={progress}><Clock size={17} /> Progress</button>}
  </div>
}

export function TaskSearch({ value, update }: { value: string; update: (value: string) => void }) {
  return <label className="task-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search chores</span>
    <input type="search" placeholder="Search chores" value={value} onChange={event => update(event.target.value)} /></label>
}
