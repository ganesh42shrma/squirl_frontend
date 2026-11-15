import { useState } from 'react';
import { Fire, Gear, Moon, PencilSimple, Plus, X } from '@phosphor-icons/react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { QuestConfigurator } from './QuestConfigurator';
import { SystemWindow } from './SystemWindow';
import { useCountdown } from './taskUtils';
import { useCheckIn, useCompletePenalty, useHabits, useSetQuestItems, useToggleQuestItem, useUndoCheckIn } from './useTasks';

// Replace today's lines: habits to include and free-form lines. The template for future days is in Hunter > settings.
function QuestEditor({ quest, onClose }) {
  const habits = useHabits();
  const save = useSetQuestItems();
  const [custom, setCustom] = useState(() => quest.items.filter((i) => i.type === 'custom').map((i) => ({ key: i.key, title: i.title })));
  const [picked, setPicked] = useState(() => new Set(quest.items.filter((i) => i.type === 'habit').map((i) => i.refId)));
  const count = custom.filter((c) => c.title.trim()).length + picked.size;
  const submit = (e) => {
    e.preventDefault();
    const items = [
      ...[...picked].map((refId) => ({ type: 'habit', refId })),
      ...custom.filter((c) => c.title.trim()).map((c) => ({ type: 'custom', title: c.title.trim(), key: c.key })),
    ];
    save.mutate(items, { onSuccess: onClose });
  };
  return (
    <Dialog title="Edit today’s Daily Quest" onClose={onClose} footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={save.isPending || count > 5}>{save.isPending ? 'Saving…' : 'Save'}</Button></>}>
      <form className="quest-editor" onSubmit={submit}>
        <p className="task-muted">Only today changes. Up to five items. Ticks on lines you keep are preserved.</p>
        {habits.data?.length > 0 && (
          <fieldset className="quest-editor__group"><legend>Habits</legend>
            {habits.data.map((h) => (
              <label key={h._id} className="check-row">
                <input type="checkbox" checked={picked.has(h._id)} onChange={(e) => setPicked((p) => { const next = new Set(p); e.target.checked ? next.add(h._id) : next.delete(h._id); return next; })} />
                {h.name}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset className="quest-editor__group"><legend>Lines</legend>
          {custom.map((c, i) => (
            <div key={c.key || i} className="task-addline">
              <input className="input" value={c.title} maxLength={120} aria-label={`Quest line ${i + 1}`} onChange={(e) => setCustom((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <button type="button" className="icon-button" aria-label={`Remove line ${i + 1}`} onClick={() => setCustom((all) => all.filter((_, j) => j !== i))}><X size={14} /></button>
            </div>
          ))}
          <button type="button" className="btn btn--quiet btn--small" disabled={count >= 5} onClick={() => setCustom((all) => [...all, { title: '' }])}><Plus size={14} aria-hidden="true" /> Add a line</button>
        </fieldset>
        {count > 5 && <p className="import-error" role="alert">That’s {count} items; the Daily Quest holds five.</p>}
        {save.isError && <p className="import-error" role="alert">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}

/** The Daily Quest as a System window (plus the Penalty Quest window when one is open). */
export function QuestWindow({ quest }) {
  const toggle = useToggleQuestItem();
  const checkIn = useCheckIn();
  const undo = useUndoCheckIn();
  const penalty = useCompletePenalty();
  const [editing, setEditing] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const left = useCountdown(quest?.closesAt);
  const busy = toggle.isPending || checkIn.isPending || undo.isPending;
  const error = [toggle, checkIn, undo, penalty].find((m) => m.isError)?.error;
  if (!quest) return null;
  const open = quest.status === 'open' || quest.status === 'penalty_open';
  const cleared = quest.status === 'cleared';
  const tick = (item) => {
    if (!open) return;
    if (item.type === 'custom') toggle.mutate(item.key);
    else if (item.done) undo.mutate({ id: item.refId, date: quest.date });
    else checkIn.mutate({ id: item.refId, date: quest.date });
  };

  return (
    <div className="quest-stack">
      {quest.penalty && (
        <SystemWindow title="PENALTY QUEST" tone="red" className="quest-penalty">
          <p>Your Daily Quest from {quest.penalty.missedOn} was left unfinished. Complete <strong>{quest.penalty.title}</strong> before the day closes ({left}) to keep your {quest.chain}-day chain.</p>
          <div className="quest-actions">
            <Button variant="accent" onClick={() => penalty.mutate()} disabled={penalty.isPending}>{penalty.isPending ? 'Saving…' : 'I did it · +20 XP'}</Button>
          </div>
        </SystemWindow>
      )}
      <SystemWindow
        title={cleared ? 'DAILY QUEST CLEARED' : 'DAILY QUEST'}
        tone={cleared ? 'gold' : undefined}
        actions={<span className="quest-head-actions"><span className="sys-xp__label"><span className="sys-num">{quest.status === 'none' ? '' : cleared ? 'Done for today' : `Day closes in ${left}`}</span></span><button type="button" className="quest-config-btn" onClick={() => setConfiguring(true)} aria-label="Configure Daily Quest"><Gear size={14} aria-hidden="true" /> Configure</button></span>}
      >
        {quest.onVacation || quest.status === 'paused' ? (
          <p><Moon size={16} aria-hidden="true" /> You’re on a break. The quest and your streaks are paused, and nothing is lost.</p>
        ) : quest.status === 'none' ? (
          <>
            <p className="sys-muted">No Daily Quest is set. Add lines or flag habits to build one.</p>
            <div className="quest-actions"><Button variant="accent" size="small" onClick={() => setConfiguring(true)}><Gear size={14} aria-hidden="true" /> Set up your Daily Quest</Button><Button variant="quiet" size="small" onClick={() => setEditing(true)}><Plus size={14} aria-hidden="true" /> Just for today</Button></div>
          </>
        ) : (
          <>
            <ul className="quest-items" role="list">
              {quest.items.map((item) => (
                <li key={item.key} className={item.done ? 'is-done' : ''}>
                  <label>
                    <input type="checkbox" checked={item.done} disabled={!open || busy} onChange={() => tick(item)} />
                    <span>{item.title}</span>
                    {item.type === 'habit' && <span className="sys-muted quest-items__tag">habit</span>}
                  </label>
                </li>
              ))}
            </ul>
            <div className="quest-foot">
              <p className="sys-muted">
                <span className="sys-num">{quest.done}/{quest.total}</span> complete · clear all for +{quest.rewardXp} XP
              </p>
              <p className="quest-chain"><Fire size={16} weight="duotone" aria-hidden="true" /> <span className="sys-num">{quest.chain}</span> day chain <span className="sys-muted">· best {quest.longestChain}</span></p>
              {open && quest.status === 'open' && <button type="button" className="link-button" onClick={() => setEditing(true)}><PencilSimple size={13} aria-hidden="true" /> Edit today</button>}
            </div>
          </>
        )}
        {error && <p className="quest-error" role="alert">{describeError(error)}</p>}
      </SystemWindow>
      {editing && <QuestEditor quest={quest} onClose={() => setEditing(false)} />}
      {configuring && <QuestConfigurator quest={quest} onClose={() => setConfiguring(false)} />}
    </div>
  );
}
