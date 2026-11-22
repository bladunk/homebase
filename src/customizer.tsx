import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { CategoryIcon } from './dashboard'
import { categoryColors, defaultPreferences, defaultWidget, displayStyles, iconLabels, mainSection, moveWidget, textures, themeOptions, widgetDefinitions, widgetIds, type DashboardPreferences, type Section, type WidgetId, type WidgetPreference } from './dashboard-preferences'
import type { Category } from './data'

type Tab = 'Layout' | 'Sections' | 'Style' | 'Themes'
const customizerTabs: Tab[] = ['Layout', 'Sections', 'Style', 'Themes']

export function CustomizeDashboard({ preferences, categories, onSave, onClose }: {
  preferences: DashboardPreferences; categories: Category[]; onSave: (value: DashboardPreferences) => void; onClose: () => void
}) {
  const [draft, setDraft] = useState(preferences)
  const [tab, setTab] = useState<Tab>('Layout')
  const [feedback, setFeedback] = useState('')
  const available = widgetIds.filter(id => id === 'activity' || !draft.widgets.some(widget => widget.kind === id))
  const [newWidget, setNewWidget] = useState<WidgetId | ''>('')
  const [sectionName, setSectionName] = useState('')

  function label(widget: WidgetPreference) {
    return categories.find(category => widget.kind === 'activity' && category.id === widget.categoryId)?.name ?? widgetDefinitions[widget.kind].label
  }

  function updateWidget(id: string, changes: Partial<WidgetPreference>) {
    setDraft(previous => ({ ...previous, widgets: previous.widgets.map(widget => widget.id === id ? { ...widget, ...changes } : widget) }))
  }

  function move(widget: WidgetPreference, offset: -1 | 1) {
    const widgets = moveWidget(draft.widgets, widget.id, offset)
    if (widgets === draft.widgets) return
    setDraft({ ...draft, widgets })
    const index = widgets.filter(item => item.sectionId === widget.sectionId).findIndex(item => item.id === widget.id)
    setFeedback(label(widget) + ' moved to position ' + (index + 1) + '.')
  }

  function addWidget() {
    const kind = newWidget
    if (!kind || !available.includes(kind)) return
    const widget = defaultWidget(kind, kind === 'activity' ? crypto.randomUUID() : kind)
    setDraft({ ...draft, widgets: [...draft.widgets, widget] })
    setNewWidget('')
    setFeedback(label(widget) + ' added.')
  }

  function addSection() {
    const name = sectionName.trim()
    if (!name) return
    setDraft({ ...draft, sections: [...draft.sections, { id: crypto.randomUUID(), name }] })
    setSectionName('')
    setFeedback(name + ' added.')
  }

  function removeSection(section: Section) {
    if (section.id === mainSection.id) return
    setDraft({ ...draft, sections: draft.sections.filter(item => item.id !== section.id),
      widgets: draft.widgets.map(widget => widget.sectionId === section.id ? { ...widget, sectionId: mainSection.id } : widget) })
    setFeedback(section.name + ' removed. Its widgets were moved to ' + (draft.sections.find(item => item.id === mainSection.id)?.name ?? mainSection.name) + '.')
  }

  function moveSection(index: number, offset: -1 | 1) {
    const to = index + offset
    if (to < 0 || to >= draft.sections.length) return
    const sections = [...draft.sections]
    sections[index] = draft.sections[to]
    sections[to] = draft.sections[index]
    setDraft({ ...draft, sections })
    setFeedback(sections[to].name + ' moved to position ' + (to + 1) + '.')
  }

  function save() {
    if (draft.sections.some(section => !section.name.trim())) {
      setTab('Sections')
      setFeedback('Enter a name for each section.')
      return
    }
    onSave({ ...draft, sections: draft.sections.map(section => ({ ...section, name: section.name.trim() })) })
  }

  return <div className="customizer">
    <nav className="customizer-sections" aria-label="Customization sections">
      {customizerTabs.map(item => <button key={item} aria-pressed={tab === item} onClick={() => { setTab(item); setFeedback('') }}>{item}</button>)}
    </nav>
    {tab === 'Layout' && <>
      <div className="widget-add"><label>Add widget<select value={newWidget} onChange={event => setNewWidget(event.target.value as WidgetId | '')}>
        <option value="">Choose a widget</option>
        {available.map(id => <option key={id} value={id}>{widgetDefinitions[id].label}</option>)}
      </select></label><button className="secondary" disabled={!newWidget} onClick={addWidget}><Plus size={16} />Add</button></div>
      {draft.sections.map(section => {
        const widgets = draft.widgets.filter(widget => widget.sectionId === section.id)
        if (!widgets.length) return null
        return <div key={section.id} className="layout-section">
          {draft.sections.length > 1 && <h3>{section.name}</h3>}
          <ol className="customizer-list" aria-label={'Widget order in ' + section.name}>
            {widgets.map((widget, index) => <li key={widget.id} className="layout-row">
              <div className="customizer-row">
                <CategoryIcon widget={widget} />
                <label className="widget-toggle"><span>{label(widget)}</span><input type="checkbox" checked={widget.visible}
                  aria-label={'Show ' + label(widget)} onChange={event => updateWidget(widget.id, { visible: event.target.checked })} /></label>
                <button className="icon-button" aria-label={'Move ' + label(widget) + ' up'} aria-disabled={index === 0} onClick={() => move(widget, -1)}><ChevronUp size={18} /></button>
                <button className="icon-button" aria-label={'Move ' + label(widget) + ' down'} aria-disabled={index === widgets.length - 1} onClick={() => move(widget, 1)}><ChevronDown size={18} /></button>
              </div>
              <div className="layout-row-options">
                <label>Width<select value={widget.size} aria-label={label(widget) + ' width'} onChange={event => updateWidget(widget.id, { size: event.target.value as WidgetPreference['size'] })}>
                  <option value="half">Half width</option><option value="full">Full width</option>
                </select></label>
                {draft.sections.length > 1 && <label>Section<select value={widget.sectionId} aria-label={label(widget) + ' section'}
                  onChange={event => updateWidget(widget.id, { sectionId: event.target.value })}>
                  {draft.sections.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select></label>}
                <button className="icon-button" aria-label={'Remove ' + label(widget)} onClick={() => {
                  setDraft({ ...draft, widgets: draft.widgets.filter(item => item.id !== widget.id) })
                  setFeedback(label(widget) + ' removed.')
                }}><Trash2 size={17} /></button>
              </div>
            </li>)}
          </ol>
        </div>
      })}
    </>}
    {tab === 'Sections' && <>
      <form className="widget-add" onSubmit={event => { event.preventDefault(); addSection() }}>
        <label>New section<input value={sectionName} onChange={event => setSectionName(event.target.value)} required maxLength={60} placeholder="e.g. Kitchen" /></label>
        <button className="secondary"><Plus size={16} />Add section</button>
      </form>
      <ol className="customizer-list" aria-label="Section order">{draft.sections.map((section, index) => <li className="customizer-row" key={section.id}>
        <label className="section-name">Name<input aria-label={'Section ' + (index + 1) + ' name'} value={section.name} maxLength={60} required
          onChange={event => setDraft({ ...draft, sections: draft.sections.map(item => item.id === section.id ? { ...item, name: event.target.value } : item) })} /></label>
        <button className="icon-button" aria-label={'Move ' + section.name + ' section up'} aria-disabled={index === 0} onClick={() => moveSection(index, -1)}><ChevronUp size={18} /></button>
        <button className="icon-button" aria-label={'Move ' + section.name + ' section down'} aria-disabled={index === draft.sections.length - 1} onClick={() => moveSection(index, 1)}><ChevronDown size={18} /></button>
        {section.id !== mainSection.id && <button className="icon-button" aria-label={'Remove ' + section.name + ' section'} onClick={() => removeSection(section)}><Trash2 size={17} /></button>}
      </li>)}</ol>
    </>}
    {tab === 'Style' && <ul className="customizer-list" aria-label="Widget appearance">
      {draft.widgets.map(widget => <li key={widget.id} className="customizer-category">
        <div><CategoryIcon widget={widget} /><strong>{label(widget)}</strong></div>
        <label>Color<select value={widget.color} aria-label={label(widget) + ' color'} onChange={event => updateWidget(widget.id, { color: event.target.value as WidgetPreference['color'] })}>
          {Object.entries(categoryColors).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>Icon<select value={widget.icon} aria-label={label(widget) + ' icon'} onChange={event => updateWidget(widget.id, { icon: event.target.value as WidgetPreference['icon'] })}>
          {Object.entries(iconLabels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>Display<select value={widget.style} aria-label={label(widget) + ' display'} onChange={event => updateWidget(widget.id, { style: event.target.value as WidgetPreference['style'] })}>
          {Object.entries(displayStyles).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        {widget.kind === 'activity' && <label>Activity category<select value={widget.categoryId ?? ''} onChange={event => {
          const category = categories.find(item => item.id === event.target.value)
          updateWidget(widget.id, { categoryId: category?.id, ...(category ? { color: category.color, icon: category.icon } : {}) })
        }}>
          <option value="">Choose a category</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select></label>}
      </li>)}
    </ul>}
    {tab === 'Themes' && <>
      <fieldset className="theme-options">
        <legend className="sr-only">Visual theme</legend>
        {(Object.keys(themeOptions) as DashboardPreferences['theme'][]).map(theme => {
          const option = themeOptions[theme]
          return <label key={theme} className="theme-option">
            <input type="radio" name="theme" value={theme} checked={draft.theme === theme} onChange={() => setDraft({ ...draft, theme })} />
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
            <span className="theme-swatches" aria-hidden="true">{option.swatches.map(color => <i key={color} style={{ backgroundColor: color }} />)}</span>
          </label>
        })}
      </fieldset>
      <div className="appearance-options">
        <label>Widget layout<select value={draft.density} onChange={event => setDraft({ ...draft, density: event.target.value as DashboardPreferences['density'] })}>
          <option value="compact">Compact</option><option value="expanded">Expanded</option>
        </select></label>
        <label>Background texture<select value={draft.texture} onChange={event => setDraft({ ...draft, texture: event.target.value as DashboardPreferences['texture'] })}>
          {Object.entries(textures).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>Dashboard accent<input type="color" value={draft.accent || themeOptions[draft.theme].swatches[2]} onChange={event => setDraft({ ...draft, accent: event.target.value })} /></label>
        <button className="secondary" onClick={() => setDraft({ ...draft, accent: '' })}>Use theme accent</button>
      </div>
    </>}
    <p className="customizer-feedback" role="status">{feedback}</p>
    <div className="dialog-actions">
      <button className="text-button customizer-reset" onClick={() => {
        const { widgets, sections, density } = defaultPreferences()
        setDraft({ ...draft, widgets, sections, density })
        setFeedback('Default layout loaded. Save to apply it.')
      }}>Reset layout</button>
      <button className="secondary" onClick={onClose}>Cancel</button>
      <button className="primary" onClick={save}>Save dashboard</button>
    </div>
  </div>
}
