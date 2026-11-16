import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { WEEKDAYS } from './taskUtils';
import { CADENCES, DIFFICULTIES, STATS, useCreateHabit, useUpdateHabit } from './useTasks';

const HABIT_DIFFICULTIES = DIFFICULTIES.filter((d) => d.id !== 'boss');

/** Create or edit a habit: what it is, how often, and how forgiving its streak is. */
export function HabitForm({ habit, onClose }) {
  const editing = Boolean(habit);
  const create = useCreateHabit();
  const update = useUpdateHabit();
  const save = editing ? update : create;
  const [form, setForm] = useState(() => ({
    name: habit?.name || '',
    difficulty: habit?.difficulty || 'easy',
    stat: habit?.stat || '',
    cadence: habit?.cadence || 'daily',
    daysMask: habit?.daysMask ?? 31,
    targetPerPeriod: habit?.targetPerPeriod ?? 3,
    everyN: habit?.everyN ?? 2,
    counted: Boolean(habit?.targetQuantity),
    targetQuantity: habit?.targetQuantity ?? 8,
    unit: habit?.unit || '',
    freezeMax: habit?.freezeMax ?? 2,
    skipsPerWeek: habit?.skipsPerWeek ?? 1,
    inDailyQuest: habit?.inDailyQuest || false,
    requirePhoto: habit?.requirePhoto || false,
  }));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const num = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value === '' ? '' : Number(e.target.value) }));
  const toggleDay = (i) => setForm((f) => ({ ...f, daysMask: f.daysMask ^ (1 << i) }));
  const weekly = form.cadence === 'times_per_week';
  const periodic = weekly || form.cadence === 'times_per_month';

  const submit = (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(), difficulty: form.difficulty, stat: form.stat || null, cadence: form.cadence,
      freezeMax: form.freezeMax, skipsPerWeek: form.skipsPerWeek, inDailyQuest: form.inDailyQuest, requirePhoto: form.requirePhoto,
      targetQuantity: form.counted ? Number(form.targetQuantity) : null, unit: form.counted ? form.unit.trim() : null,
      ...(form.cadence === 'weekdays' && { daysMask: form.daysMask }),
      ...(periodic && { targetPerPeriod: Number(form.targetPerPeriod) }),
      ...(form.cadence === 'every_n_days' && { everyN: Number(form.everyN) }),
    };
    save.mutate(editing ? { id: habit._id, ...body } : body, { onSuccess: onClose });
  };
  const invalid = !form.name.trim() || (form.cadence === 'weekdays' && !form.daysMask) || (form.counted && (!form.unit.trim() || !(form.targetQuantity > 0)));

  return (
    <Dialog title={editing ? 'Edit habit' : 'New habit'} onClose={onClose} wide footer={<><Button variant="quiet" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={save.isPending || invalid}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create habit'}</Button></>}>
      <form className="habit-form" onSubmit={submit}>
        <label className="field task-detail__wide">Name
          <input className="input" value={form.name} onChange={set('name')} maxLength={80} placeholder="Read 20 pages" autoFocus required />
        </label>
        <label className="field">Difficulty
          <select className="select" value={form.difficulty} onChange={set('difficulty')}>{HABIT_DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.badge} · {d.label} · {d.xp} XP</option>)}</select>
        </label>
        <label className="field">Stat it trains
          <select className="select" value={form.stat} onChange={set('stat')}><option value="">None</option>{STATS.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hint}</option>)}</select>
        </label>
        <label className="field">How often
          <select className="select" value={form.cadence} onChange={set('cadence')}>{CADENCES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </label>
        {periodic && (
          <label className="field">{weekly ? 'Times per week' : 'Times per month'}
            <input className="input" type="number" min={1} max={weekly ? 7 : 31} value={form.targetPerPeriod} onChange={num('targetPerPeriod')} />
          </label>
        )}
        {form.cadence === 'every_n_days' && (
          <label className="field">Every how many days
            <input className="input" type="number" min={2} max={60} value={form.everyN} onChange={num('everyN')} />
          </label>
        )}
        {form.cadence === 'weekdays' && (
          <fieldset className="field habit-days"><legend>On these days</legend>
            <div className="chip-group">{WEEKDAYS.map((d, i) => <button key={d} type="button" className={`chip${(form.daysMask >> i) & 1 ? ' is-active' : ''}`} aria-pressed={Boolean((form.daysMask >> i) & 1)} onClick={() => toggleDay(i)}>{d}</button>)}</div>
          </fieldset>
        )}
        <div className="field task-detail__wide">
          <label className="check-row"><input type="checkbox" checked={form.counted} onChange={set('counted')} /> Count an amount each day (8 glasses, 20 pages…)</label>
          {form.counted && (
            <div className="habit-form__pair">
              <input className="input" type="number" min={1} value={form.targetQuantity} onChange={num('targetQuantity')} aria-label="Daily target" />
              <input className="input" value={form.unit} onChange={set('unit')} placeholder="glasses" maxLength={20} aria-label="Unit" />
            </div>
          )}
        </div>
        <fieldset className="task-detail__wide habit-form__forgive"><legend>Forgiveness</legend>
          <label className="field">Freezes you can hold
            <select className="select" value={form.freezeMax} onChange={num('freezeMax')}>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'None (strict)' : n}</option>)}</select>
          </label>
          <label className="field">Rest days per week
            <select className="select" value={form.skipsPerWeek} onChange={num('skipsPerWeek')}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}</select>
          </label>
          <p className="task-muted">A freeze is earned for every 7 periods in a row and quietly covers a miss. Rest days never break a streak.</p>
        </fieldset>
        <div className="field task-detail__wide">
          <label className="check-row"><input type="checkbox" checked={form.requirePhoto} onChange={set('requirePhoto')} /> Needs a photo to count</label>
          {form.requirePhoto && <p className="task-muted">Add a photo, then press Done. Days you already logged stay as they are.</p>}
        </div>
        <label className="check-row task-detail__wide"><input type="checkbox" checked={form.inDailyQuest} onChange={set('inDailyQuest')} /> Part of my Daily Quest</label>
        {save.isError && <p className="import-error task-detail__wide" role="alert">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}
