import { Suspense, useMemo, useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { Dialog } from '../../components/ui/Dialog';
import { SIZE_LABELS } from './layout';
import { WidgetFrame } from './WidgetFrame';
import { groupWidgets } from './registry';

// The "Add widget" gallery: widgets grouped by module and sub-tab, each with a live-looking
// preview drawn from sample data (never the person's real figures).
function PreviewCard({ def, onAdd, onBoard }) {
  const Preview = def.preview;
  const defaults = Object.fromEntries(def.settings.map((s) => [s.key, s.default]));
  const blocked = onBoard && !def.multi;
  return (
    <li className="picker-card">
      <div className="picker-card__preview" aria-hidden="true" data-module={def.module}>
        <div className="picker-card__scale" inert>
          <WidgetFrame title={def.title}><Preview settings={defaults} size={def.defaultSize} /></WidgetFrame>
        </div>
      </div>
      <div className="picker-card__body">
        <h4>{def.title}</h4>
        <p className="member-hint">{def.description}</p>
        <p className="picker-card__sizes">{def.sizes.map((s) => SIZE_LABELS[s]).join(' · ')}{def.multi ? ' · can be added more than once' : ''}</p>
        <button type="button" className={`btn btn--small ${blocked ? 'btn--quiet' : 'btn--accent'}`} disabled={blocked} onClick={() => onAdd(def)} aria-label={blocked ? `${def.title} is already on your dashboard` : `Add ${def.title}`}>
          {blocked ? <><Check size={14} aria-hidden="true" /> On your dashboard</> : <><Plus size={14} aria-hidden="true" /> Add</>}
        </button>
      </div>
    </li>
  );
}

export function WidgetPicker({ onAdd, onClose, onBoard }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupWidgets().map((g) => ({
      ...g,
      tabs: g.tabs.map((t) => ({ ...t, widgets: t.widgets.filter((w) => !q || `${w.title} ${w.description} ${t.label} ${g.module.label}`.toLowerCase().includes(q)) })).filter((t) => t.widgets.length),
    })).filter((g) => g.tabs.length);
  }, [query]);
  return (
    <Dialog title="Add a widget" onClose={onClose} wide>
      <div className="picker">
        <label className="field">Search widgets
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Goals, weather, streaks…" autoFocus />
        </label>
        <p className="member-hint" role="status">Previews use sample data. Imports and Sort out are working pages, so they don’t offer widgets.</p>
        {groups.length === 0 && <p className="task-empty">No widget matches “{query}”.</p>}
        {groups.map((g) => (
          <section key={g.module.id} className="picker-group" aria-label={g.module.label}>
            <h3><g.module.icon size={18} weight="duotone" aria-hidden="true" /> {g.module.label}</h3>
            {g.tabs.map((t) => (
              <div key={t.id} className="picker-tab">
                <h4 className="picker-tab__title">{t.label}</h4>
                <Suspense fallback={null}>
                  <ul className="picker-grid" role="list">
                    {t.widgets.map((w) => <PreviewCard key={w.id} def={w} onBoard={onBoard(w.id)} onAdd={onAdd} />)}
                  </ul>
                </Suspense>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Dialog>
  );
}
