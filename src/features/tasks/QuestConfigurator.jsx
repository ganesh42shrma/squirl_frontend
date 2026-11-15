import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, X } from '@phosphor-icons/react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { tasksPath } from '../../app/paths';
import { useConfigureQuest, useHabits, useTasksSettings } from './useTasks';

const SLOTS = 5;

/**
 * Configure the Daily Quest every day starts from: which habits are in it, your own lines, and what
 * happens on a missed day. Habits and lines share five slots. Saves in one step, and can update
 * today's open quest at the same time.
 */
function ConfiguratorForm({ settings, habits, quest, onClose }) {
  const save = useConfigureQuest();
  const [lines, setLines] = useState(settings.dailyQuestTemplate);
  const [picked, setPicked] = useState(() => new Set(habits.filter((h) => h.inDailyQuest).map((h) => h._id)));
  const [penaltyOn, setPenaltyOn] = useState(Boolean(settings.penaltyTask));
  const [penalty, setPenalty] = useState(settings.penaltyTask || 'Extra 20-minute walk');
  const settled = quest && !['open', 'paused', 'none'].includes(quest.status);
  const [applyToday, setApplyToday] = useState(!settled);
  const used = picked.size + lines.length;
  const full = used >= SLOTS;
  const filled = lines.map((l) => l.trim()).filter(Boolean);
  const invalid = used > SLOTS || (penaltyOn && !penalty.trim());
  const move = (i, d) => setLines((all) => { const next = [...all]; [next[i], next[i + d]] = [next[i + d], next[i]]; return next; });
  const chosen = habits.filter((h) => picked.has(h._id));

  const submit = (e) => {
    e.preventDefault();
    if (invalid) return;
    save.mutate({ lines: filled, habitIds: [...picked], penaltyTask: penaltyOn ? penalty.trim() : '', applyToday: applyToday && !settled }, { onSuccess: onClose });
  };

  return (
    <form className="quest-config" onSubmit={submit} id="quest-config-form">
      <p className="task-muted">Set this once and every new day starts from it. You can still tweak a single day with “Edit today”.</p>
      <p className={`quest-config__slots${used > SLOTS ? ' is-over' : ''}`} role="status">{used} of {SLOTS} slots used</p>

      <fieldset className="quest-editor__group"><legend>Habits in the quest</legend>
        {habits.length === 0 ? (
          <p className="task-muted">You have no habits yet. <Link to={tasksPath('habits', '?new=1')} onClick={onClose}>Create one</Link>, then add it here.</p>
        ) : habits.map((h) => (
          <label key={h._id} className="check-row">
            <input type="checkbox" checked={picked.has(h._id)} disabled={!picked.has(h._id) && full}
              onChange={(e) => setPicked((p) => { const next = new Set(p); e.target.checked ? next.add(h._id) : next.delete(h._id); return next; })} />
            {h.name}
            {picked.has(h._id) && <span className="task-muted"> · done when you check the habit in</span>}
          </label>
        ))}
      </fieldset>

      <fieldset className="quest-editor__group"><legend>Your own lines</legend>
        {lines.length === 0 && <p className="task-muted">No lines. Add things like “Read 10 pages” or “Plan tomorrow”.</p>}
        {lines.map((line, i) => (
          <div key={i} className="task-addline">
            <input className="input" value={line} maxLength={120} aria-label={`Quest line ${i + 1}`} placeholder="e.g. Move for 20 minutes" onChange={(e) => setLines((all) => all.map((l, j) => (j === i ? e.target.value : l)))} />
            <button type="button" className="icon-button" aria-label={`Move line ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
            <button type="button" className="icon-button" aria-label={`Move line ${i + 1} down`} disabled={i === lines.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
            <button type="button" className="icon-button" aria-label={`Remove line ${i + 1}`} onClick={() => setLines((all) => all.filter((_, j) => j !== i))}><X size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn btn--quiet btn--small" disabled={full} onClick={() => setLines((all) => [...all, ''])}><Plus size={14} aria-hidden="true" /> Add a line{full ? ' (no slots left)' : ''}</button>
      </fieldset>

      <fieldset className="quest-editor__group"><legend>If you miss a day</legend>
        <label className="check-row"><input type="checkbox" checked={penaltyOn} onChange={(e) => setPenaltyOn(e.target.checked)} /> Open a Penalty Quest the next day</label>
        {penaltyOn ? (
          <>
            <input className="input" value={penalty} maxLength={120} aria-label="Penalty Quest" onChange={(e) => setPenalty(e.target.value)} />
            <p className="task-muted">Do it before that day closes and your chain survives (+20 XP). Skip it and the chain resets. You never lose XP or levels.</p>
          </>
        ) : <p className="task-muted">With no penalty, a missed day resets the chain straight away. XP and levels are still untouched.</p>}
      </fieldset>

      <div className="quest-config__preview">
        <h3>Each day will show</h3>
        {chosen.length + filled.length === 0 ? <p className="task-muted">Nothing: there will be no Daily Quest.</p> : (
          <ol>{[...chosen.map((h) => <li key={h._id}>{h.name} <span className="task-muted">(habit)</span></li>), ...filled.map((l, i) => <li key={`l${i}`}>{l}</li>)]}</ol>
        )}
      </div>

      <label className="check-row"><input type="checkbox" checked={applyToday && !settled} disabled={settled} onChange={(e) => setApplyToday(e.target.checked)} /> Also update today’s quest{settled ? ' (already settled, so it stays as it is)' : ''}</label>
      {save.isError && <p className="import-error" role="alert">{describeError(save.error)}</p>}
      <div className="quest-config__foot">
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={save.isPending || invalid}>{save.isPending ? 'Saving…' : 'Save Daily Quest'}</Button>
      </div>
    </form>
  );
}

export function QuestConfigurator({ quest, onClose }) {
  const settings = useTasksSettings();
  const habits = useHabits();
  return (
    <Dialog title="Configure Daily Quest" onClose={onClose} wide>
      {settings.isLoading || habits.isLoading ? <div className="insight-skeleton" /> : settings.isError || habits.isError
        ? <p className="import-error" role="alert">{describeError(settings.error || habits.error)}</p>
        : <ConfiguratorForm settings={settings.data} habits={habits.data} quest={quest} onClose={onClose} />}
    </Dialog>
  );
}
