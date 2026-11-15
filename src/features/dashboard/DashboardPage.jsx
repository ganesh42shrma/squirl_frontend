import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowCounterClockwise, PencilSimple, Plus, SquaresFour } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useMe, useProfile, useUpdateProfile } from '../auth/useAuth';
import { greeting } from './DashboardParts';
import { DashboardBoard } from './DashboardBoard';
import { WidgetPicker } from './WidgetPicker';
import { TemplatePicker } from './TemplatePicker';
import { makeTemplateItems } from './templates';
import { MAX_ITEMS, defaultItems, makeItem, moveItem, normalizeConfig, resolveItems, sameItems } from './layout';
import { WIDGET_BY_ID } from './registry';
import './dashboard.css';

export function DashboardPage() {
  const { data: me } = useMe();
  const profile = useProfile();
  const save = useUpdateProfile();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const saved = useMemo(() => normalizeConfig(profile.data?.dashboardConfig).items, [profile.data]);
  const [draft, setDraft] = useState(null); // null = not editing
  const [picking, setPicking] = useState(false);
  const [choosingTemplate, setChoosingTemplate] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const editing = draft !== null;
  const items = editing ? draft : saved;
  const entries = useMemo(() => resolveItems(items, WIDGET_BY_ID), [items]);

  // /app?customize=1 (the old "Configure dashboard" links) opens edit mode.
  const wantsCustomize = params.get('customize') === '1';
  useEffect(() => {
    if (!wantsCustomize || !profile.data) return;
    setDraft((d) => d ?? saved);
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('customize'); return next; }, { replace: true });
  }, [wantsCustomize, profile.data, saved, setParams]);

  const change = (fn) => setDraft((d) => fn(d ?? saved));
  const onMove = useCallback((key, delta) => {
    setDraft((d) => moveItem(d, key, delta, (i) => WIDGET_BY_ID.has(i.widget)));
    const index = entries.findIndex((e) => e.item.key === key);
    const target = Math.min(entries.length - 1, Math.max(0, index + delta));
    setAnnouncement(`${entries[index]?.def.title || 'Widget'} moved to position ${target + 1} of ${entries.length}.`);
  }, [entries]);
  const onSize = (key, size) => change((d) => d.map((i) => (i.key === key ? { ...i, size } : i)));
  const onSettings = (key, settings) => change((d) => d.map((i) => (i.key === key ? { ...i, settings } : i)));
  const onRemove = (key) => {
    setAnnouncement(`${WIDGET_BY_ID.get(items.find((i) => i.key === key)?.widget)?.title || 'Widget'} removed.`);
    change((d) => d.filter((i) => i.key !== key));
  };
  const onAdd = (def) => {
    if (items.length >= MAX_ITEMS) return;
    change((d) => [...d, makeItem(def.id, def.defaultSize, Object.fromEntries(def.settings.map((s) => [s.key, s.default])))]);
    setAnnouncement(`${def.title} added at the end of your dashboard.`);
    setPicking(false);
  };
  const onTemplate = (template) => {
    setDraft(makeTemplateItems(template));
    setChoosingTemplate(false);
    setAnnouncement(`${template.name} template applied. You can edit its widgets before saving.`);
  };

  const dirty = editing && !sameItems(draft, saved);
  const finish = () => { setDraft(null); setPicking(false); setChoosingTemplate(false); };
  const submit = () => save.mutate({ dashboardConfig: { version: 2, items: draft } }, { onSuccess: () => { toast('Dashboard saved'); finish(); } });

  if (profile.isLoading) return <div className="insight-skeleton" />;
  if (profile.isError) return <p className="import-error" role="alert">{describeError(profile.error)}</p>;

  return (
    <div className="dashboard">
      <header className="dashboard-title-row">
        <div className="dash-head">
          <h1>{greeting()}{me?.name ? `, ${me.name.split(/\s+/)[0]}` : ''}</h1>
          <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {!editing && <Button variant="quiet" size="small" onClick={() => setDraft(saved)}><PencilSimple size={14} aria-hidden="true" /> Customize</Button>}
      </header>

      {editing && (
        <p className="dashboard-edit-hint" role="status">
          <strong>Customizing.</strong> Start with a template, or resize, reorder and configure your widgets. Changes apply when you save.
        </p>
      )}

      {entries.length === 0 ? (
        <section className="dash-welcome dash-empty">
          <div>
            <h2>Your board is empty</h2>
            <p>Pick widgets from Finance and Tasks to build the dashboard you want.</p>
            <div className="dash-welcome__actions">
              {!editing && <Button onClick={() => setDraft(saved)} variant="accent">Customize</Button>}
              {editing && <Button onClick={() => setPicking(true)} variant="accent"><Plus size={14} aria-hidden="true" /> Add a widget</Button>}
            </div>
          </div>
        </section>
      ) : (
        <DashboardBoard entries={entries} editing={editing} onMove={onMove} onSize={onSize} onRemove={onRemove} onSettings={onSettings} />
      )}

      <p className="visually-hidden" role="status" aria-live="polite">{announcement}</p>

      {editing && (
        <div className="dashboard-editbar" role="region" aria-label="Dashboard editing">
          <div className="dashboard-editbar__left">
            <Button variant="quiet" size="small" onClick={() => setChoosingTemplate(true)} disabled={save.isPending}><SquaresFour size={14} aria-hidden="true" /> Templates</Button>
            <Button variant="quiet" size="small" onClick={() => setPicking(true)} disabled={items.length >= MAX_ITEMS}><Plus size={14} aria-hidden="true" /> Add widget</Button>
            <Button variant="quiet" size="small" onClick={() => setDraft(defaultItems())} disabled={save.isPending}><ArrowCounterClockwise size={14} aria-hidden="true" /> Reset layout</Button>
            {dirty && <span className="member-hint">Unsaved changes</span>}
          </div>
          <div className="dashboard-editbar__right">
            {save.isError && <span className="import-error" role="alert">{describeError(save.error)}</span>}
            <Button variant="quiet" onClick={finish} disabled={save.isPending}>{dirty ? 'Discard' : 'Done'}</Button>
            <Button onClick={submit} disabled={!dirty || save.isPending}>{save.isPending ? 'Saving…' : 'Save dashboard'}</Button>
          </div>
        </div>
      )}
      {picking && <WidgetPicker onAdd={onAdd} onClose={() => setPicking(false)} onBoard={(id) => items.some((i) => i.widget === id)} />}
      {choosingTemplate && <TemplatePicker onChoose={onTemplate} onClose={() => setChoosingTemplate(false)} />}
    </div>
  );
}
