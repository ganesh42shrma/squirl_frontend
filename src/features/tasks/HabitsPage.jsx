import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive, ArrowCounterClockwise, Camera, Check, Crown, Fire, Minus, Moon, PencilSimple, Plus, Snowflake, Trash } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { HabitForm } from './HabitForm';
import { HabitPhotoDialog } from './HabitPhotoDialog';
import { SystemWindow } from './SystemWindow';
import { addDaysKey, cadenceText, streakUnit } from './taskUtils';
import { useArchiveHabit, useBindEcho, useCheckIn, useDeleteHabit, useHabits, useToday, useUndoCheckIn } from './useTasks';
import './tasks.css';

const STATE_LABEL = { done: 'done', partial: 'partly done', skip: 'rest day', miss: 'missed', off: 'not scheduled', future: 'upcoming' };

// The last five weeks as a little grid, oldest first. Colour is never the only signal: each cell has a label.
export function HistoryGrid({ days }) {
  const done = days.filter((d) => d.state === 'done').length;
  return (
    <div className="habit-grid" role="img" aria-label={`Last ${days.length} days: ${done} done`}>
      {days.map((d) => <span key={d.date} className={`habit-grid__cell is-${d.state}`} title={`${d.date}: ${STATE_LABEL[d.state]}`} />)}
    </div>
  );
}

function HabitCard({ habit, today }) {
  const checkIn = useCheckIn();
  const undo = useUndoCheckIn();
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();
  const bind = useBindEcho();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [proof, setProof] = useState(null); // { date, label, viewOnly }: the photo dialog for a day
  const busy = checkIn.isPending || undo.isPending;
  const error = [checkIn, undo, archive, remove, bind].find((m) => m.isError)?.error;
  const yesterday = addDaysKey(today, -1);
  const yState = habit.days?.find((d) => d.date === yesterday)?.state;
  const counted = Boolean(habit.targetQuantity);
  const quantity = habit.quantityToday ?? 0;
  const live = !habit.archived;

  const setQuantity = (next) => (next <= 0 ? undo.mutate({ id: habit._id, date: today }) : checkIn.mutate({ id: habit._id, quantity: next }));
  const unit = streakUnit(habit, habit.currentStreak);

  return (
    <li className={`habit-card${habit.doneToday ? ' is-done' : ''}${habit.archived ? ' is-archived' : ''}`}>
      <div className="habit-card__head">
        <div>
          <h3>{habit.name}</h3>
          <p className="task-muted">{cadenceText(habit)}{habit.requirePhoto ? ' · photo each day' : ''}{counted ? ` · ${habit.targetQuantity} ${habit.unit} a day` : ''}</p>
        </div>
        {habit.echo && <span className="echo-tag" title={`Bound Echo: +1% XP`}><Crown size={13} weight="fill" aria-hidden="true" /> {habit.echo.grade}</span>}
      </div>

      <div className="habit-card__streak">
        <span className="habit-streak" aria-label={`Current streak: ${habit.currentStreak} ${unit}`}>
          <Fire size={22} weight={habit.currentStreak ? 'fill' : 'regular'} aria-hidden="true" className={habit.currentStreak ? 'is-lit' : ''} />
          <strong className="num">{habit.currentStreak}</strong>
          <span className="task-muted">{unit}</span>
        </span>
        <span className="task-muted">Best {habit.longestStreak}</span>
        <span className="habit-freezes task-muted" title={`Freezes cover a miss. You earn one for every 7 ${streakUnit(habit, 2)} in a row.`}>
          <Snowflake size={14} aria-hidden="true" /> {habit.freezesHeld}/{habit.freezeMax}
        </span>
      </div>

      {habit.period && ['times_per_week', 'times_per_month', 'every_n_days'].includes(habit.cadence) && (
        <p className="habit-period" role="status">
          {habit.period.done} of {habit.period.target} {habit.cadence === 'times_per_week' ? 'this week' : habit.cadence === 'times_per_month' ? 'this month' : 'this round'}
          {habit.period.complete && <Check size={14} aria-hidden="true" />}
        </p>
      )}

      <HistoryGrid days={habit.days || []} />

      {live && (
        <div className="habit-card__actions">
          {!habit.scheduledToday ? (
            <p className="task-muted"><Moon size={14} aria-hidden="true" /> Not scheduled today</p>
          ) : habit.requirePhoto && habit.doneToday ? (
            <>
              <Button size="small" variant="quiet" disabled={busy} onClick={() => undo.mutate({ id: habit._id, date: today })}><ArrowCounterClockwise size={14} aria-hidden="true" /> Undo today</Button>
              <Button size="small" variant="quiet" onClick={() => setProof({ date: today, label: 'today', viewOnly: true })}><Camera size={14} aria-hidden="true" /> Photo</Button>
            </>
          ) : habit.requirePhoto && !habit.skippedToday ? (
            <>
              <Button size="small" variant="accent" disabled={busy} onClick={() => setProof({ date: today, label: 'today' })}><Camera size={14} aria-hidden="true" /> Check in with photo</Button>
              {habit.skipsPerWeek > 0 && <Button size="small" variant="quiet" disabled={busy} onClick={() => checkIn.mutate({ id: habit._id, kind: 'skip' })}>Rest day</Button>}
            </>
          ) : counted ? (
            <div className="habit-counter" role="group" aria-label={`${habit.name}: ${quantity} of ${habit.targetQuantity} ${habit.unit}`}>
              <button type="button" className="icon-button" aria-label="One less" disabled={busy || quantity <= 0} onClick={() => setQuantity(quantity - 1)}><Minus size={14} /></button>
              <span className="num habit-counter__value">{quantity}<span className="task-muted"> / {habit.targetQuantity} {habit.unit}</span></span>
              <button type="button" className="icon-button" aria-label="One more" disabled={busy} onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></button>
              {!habit.doneToday && <Button size="small" variant="quiet" disabled={busy} onClick={() => setQuantity(habit.targetQuantity)}>Done</Button>}
            </div>
          ) : habit.doneToday ? (
            <Button size="small" variant="quiet" disabled={busy} onClick={() => undo.mutate({ id: habit._id, date: today })}><ArrowCounterClockwise size={14} aria-hidden="true" /> Undo today</Button>
          ) : habit.skippedToday ? (
            <Button size="small" variant="quiet" disabled={busy} onClick={() => undo.mutate({ id: habit._id, date: today })}><ArrowCounterClockwise size={14} aria-hidden="true" /> Undo rest day</Button>
          ) : (
            <>
              <Button size="small" variant="accent" disabled={busy} onClick={() => checkIn.mutate({ id: habit._id })}><Check size={14} aria-hidden="true" /> Check in</Button>
              {habit.skipsPerWeek > 0 && <Button size="small" variant="quiet" disabled={busy} onClick={() => checkIn.mutate({ id: habit._id, kind: 'skip' })}>Rest day</Button>}
            </>
          )}
          {yState === 'miss' && <button type="button" className="link-button" disabled={busy} onClick={() => (habit.requirePhoto ? setProof({ date: yesterday, label: 'yesterday' }) : checkIn.mutate({ id: habit._id, date: yesterday }))}>Log yesterday</button>}
          {habit.canBind && <Button size="small" variant="quiet" disabled={bind.isPending} onClick={() => bind.mutate(habit._id)}><Crown size={14} aria-hidden="true" /> Bind as Echo</Button>}
        </div>
      )}
      {error && <p className="import-error" role="alert">{describeError(error)}</p>}

      <div className="habit-card__tools">
        <button type="button" className="icon-button" aria-label={`Edit ${habit.name}`} onClick={() => setEditing(true)}><PencilSimple size={15} /></button>
        <button type="button" className="icon-button" aria-label={habit.archived ? `Restore ${habit.name}` : `Archive ${habit.name}`} onClick={() => archive.mutate({ id: habit._id, archived: !habit.archived })}>{habit.archived ? <ArrowCounterClockwise size={15} /> : <Archive size={15} />}</button>
        <button type="button" className={`icon-button${confirm ? ' is-danger' : ''}`} aria-label={confirm ? `Confirm delete ${habit.name}` : `Delete ${habit.name}`} onBlur={() => setConfirm(false)} onClick={() => (confirm ? remove.mutate(habit._id) : setConfirm(true))}>{confirm ? <span className="icon-button__text">Delete?</span> : <Trash size={15} />}</button>
      </div>
      {editing && <HabitForm habit={habit} onClose={() => setEditing(false)} />}
      {proof && <HabitPhotoDialog habit={habit} date={proof.date} label={proof.label} viewOnly={proof.viewOnly} onClose={() => setProof(null)} />}
    </li>
  );
}

export function HabitsPage() {
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const habits = useHabits(false);
  const archived = useHabits(true);
  const today = useToday();
  const wantsNew = params.get('new') === '1';
  useEffect(() => {
    if (!wantsNew) return;
    setCreating(true);
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('new'); return next; }, { replace: true });
  }, [wantsNew, setParams]);

  if (habits.isLoading || today.isLoading) return <div className="insight-skeleton" />;
  if (habits.isError || today.isError) return <p className="import-error" role="alert">{describeError(habits.error || today.error)}</p>;
  const list = habits.data;
  const date = today.data.date;

  return (
    <div className="tasks-page">
      <header className="page-head tasks-head">
        <div><h1>Streaks</h1><p>Habits that count periods, not perfection. Freezes, rest days and vacations protect a chain; a miss never takes your XP.</p></div>
        <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" /> New habit</Button>
      </header>
      {list.length === 0 ? (
        <SystemWindow title="NO HABITS YET">
          <p>Habits are things you repeat: reading, walking, no-spend days. Each check-in pays XP, and the streak multiplies it (up to ×1.5).</p>
          <div className="quest-actions"><Button variant="accent" onClick={() => setCreating(true)}>Create your first habit</Button></div>
        </SystemWindow>
      ) : (
        <ul className="habit-grid-list" role="list">{list.map((h) => <HabitCard key={h._id} habit={h} today={date} />)}</ul>
      )}
      {archived.data?.length > 0 && (
        <section className="habit-archived">
          <button type="button" className="link-button" aria-expanded={showArchived} onClick={() => setShowArchived((v) => !v)}>{showArchived ? 'Hide' : 'Show'} archived habits ({archived.data.length})</button>
          {showArchived && <ul className="habit-grid-list" role="list">{archived.data.map((h) => <HabitCard key={h._id} habit={h} today={date} />)}</ul>}
        </section>
      )}
      {creating && <HabitForm onClose={() => setCreating(false)} />}
    </div>
  );
}
