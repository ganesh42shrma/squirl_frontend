import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Check } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useProfile, useUpdateProfile } from '../auth/useAuth';
import { useBalances } from '../insights/useInsights';
import { formatAccount } from '../../lib/format';
import { WIDGETS, PERIODS, METRICS, defaults, getConfig } from './dashboardConfig';
import { DashboardLayout } from './DashboardLayout';
import { MOCK_DATA } from './mockDashboard';
import './dashboard.css';

export function ConfigureDashboardPage() {
  const profile = useProfile();
  if (profile.isLoading) return <div className="insight-skeleton" />;
  if (profile.isError) return <p className="import-error">{describeError(profile.error)}</p>;
  return <DashboardEditor profile={profile.data} />;
}

function DashboardEditor({ profile }) {
  const [draft, setDraft] = useState(() => getConfig(profile.dashboardConfig));
  const [saved, setSaved] = useState(() => getConfig(profile.dashboardConfig));
  const [selected, setSelected] = useState('breakdown');
  const save = useUpdateProfile();
  const toast = useToast();
  const { data: balances } = useBalances();
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const active = draft.widgets.find((w) => w.id === selected);
  const definition = WIDGETS.find((w) => w.id === selected);
  const accounts = [...new Set(['all', 'sbi', 'kotak', 'cash', ...(balances?.accounts || []).map((a) => a.account), active.account])];
  const patch = (id, changes) => setDraft((d) => ({ ...d, widgets: d.widgets.map((w) => w.id === id ? { ...w, ...changes } : w) }));
  const move = (index, delta) => setDraft((d) => {
    const widgets = [...d.widgets];
    [widgets[index], widgets[index + delta]] = [widgets[index + delta], widgets[index]];
    return { ...d, widgets };
  });
  return <div className="dashboard-config">
    <header className="dashboard-config-head">
      <div><Link to="/app/profile" className="dash-link">← Profile</Link><h1>Configure dashboard</h1><p className="member-hint">Choose widgets and data. Preview uses sample data.</p></div>
      <div className="profile-form__actions">
        <Button variant="quiet" disabled={!changed || save.isPending} onClick={() => setDraft(saved)}>Discard</Button>
        <Button disabled={!changed || save.isPending || !draft.widgets.some((w) => w.enabled)} onClick={() => save.mutate({ dashboardConfig: draft }, { onSuccess: (p) => {
          const next = getConfig(p.dashboardConfig); setSaved(next); setDraft(next); toast('Dashboard saved');
        } })}>{save.isPending ? 'Saving…' : 'Save dashboard'}</Button>
      </div>
    </header>
    {save.isError && <p className="import-error">{describeError(save.error)}</p>}
    <div className="dashboard-config-grid">
      <aside className="dashboard-controls">
        <div className="dashboard-control-head"><h2>Widgets</h2><button className="link-button" type="button" disabled={save.isPending} onClick={() => setDraft(defaults())}>Reset layout</button></div>
        <ul className="dashboard-widget-choices">{draft.widgets.map((w, i) => <li className={selected === w.id ? 'is-selected' : ''} key={w.id}>
          <input type="checkbox" aria-label={`Show ${WIDGETS.find((d) => d.id === w.id).title}`} checked={w.enabled} disabled={save.isPending} onChange={(e) => patch(w.id, { enabled: e.target.checked })} />
          <button type="button" className="widget-choice-name" onClick={() => setSelected(w.id)} aria-pressed={selected === w.id}>{WIDGETS.find((d) => d.id === w.id).title}</button>
          <button type="button" className="widget-order" aria-label={`Move ${w.id} up`} disabled={i === 0 || save.isPending} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
          <button type="button" className="widget-order" aria-label={`Move ${w.id} down`} disabled={i === draft.widgets.length - 1 || save.isPending} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
        </li>)}</ul>
        <fieldset className="dashboard-widget-settings" disabled={save.isPending}><legend>{definition.title}</legend>
          <label className="field">Width<select className="select" value={active.width} onChange={(e) => patch(selected, { width: e.target.value })}><option value="half">Half</option><option value="full">Full</option></select></label>
          {definition.period && <label className="field">Period<select className="select" value={active.period} onChange={(e) => patch(selected, { period: e.target.value })}>{Object.entries(PERIODS).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>}
          {definition.account && <label className="field">Account<select className="select" value={active.account} onChange={(e) => patch(selected, { account: e.target.value })}>{accounts.map((id) => <option key={id} value={id}>{id === 'all' ? 'All accounts' : formatAccount(id)}</option>)}</select></label>}
          {definition.metric && <label className="field">Data<select className="select" value={active.metric} onChange={(e) => patch(selected, { metric: e.target.value })}>{Object.entries(METRICS).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>}
        </fieldset>
        {!draft.widgets.some((w) => w.enabled) && <p className="import-error">Choose at least one widget.</p>}
        {changed && <p className="member-hint">Unsaved changes</p>}
      </aside>
      <section className="dashboard-preview" aria-label="Dashboard preview" onClick={(e) => { if (e.target.closest('a')) e.preventDefault(); }}>
        <div className="dashboard-preview-head"><h2>Preview</h2><span className="mock-badge"><Check size={12} /> Sample data</span></div>
        <DashboardLayout config={draft} data={MOCK_DATA} preview />
      </section>
    </div>
  </div>;
}
