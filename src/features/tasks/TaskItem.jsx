import { useEffect, useRef, useState } from 'react';
import { CaretDown, CaretRight, ListChecks, Repeat, Trash, X } from '@phosphor-icons/react';
import { describeError } from '../../api/client';
import { AttachmentsPanel } from '../media/AttachmentsPanel';
import { DifficultyBadge } from './SystemWindow';
import { dueLabel, REPEAT_OPTIONS, repeatId } from './taskUtils';
import {
  DIFFICULTIES, STATS, useAddChecklistItem, useCompleteTask, useCreateTask, useDeleteTask, useRemoveChecklistItem,
  useReopenTask, useUpdateChecklistItem, useUpdateTask,
} from './useTasks';

function AddLine({ placeholder, label, onAdd, disabled }) {
  const [text, setText] = useState('');
  return (
    <form className="task-addline" onSubmit={(e) => { e.preventDefault(); const value = text.trim(); if (value) { onAdd(value); setText(''); } }}>
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={label} maxLength={200} disabled={disabled} />
      <button type="submit" className="btn btn--quiet btn--small" disabled={disabled || !text.trim()}>Add</button>
    </form>
  );
}

// The editable detail under an open task: fields, subtasks, checklist, delete.
function TaskDetail({ task, today, lists }) {
  const update = useUpdateTask();
  const remove = useDeleteTask();
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  const create = useCreateTask();
  const addItem = useAddChecklistItem();
  const updateItem = useUpdateChecklistItem();
  const removeItem = useRemoveChecklistItem();
  const [confirm, setConfirm] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const done = task.status === 'done';
  const error = [update, remove, create, addItem, updateItem, removeItem, complete, reopen].find((m) => m.isError)?.error;
  const patch = (changes) => update.mutate({ id: task._id, ...changes });
  const subtasks = task.subtasks || [];
  const subtaskCount = subtasks.length;

  return (
    <div className="task-detail">
      {error && <p className="import-error" role="alert">{describeError(error)}</p>}
      <div className="task-detail__grid">
        <label className="field task-detail__wide">Title
          <input className="input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title.trim() !== task.title && patch({ title: title.trim() })} />
        </label>
        {!task.parentId && (
          <>
            <label className="field">Difficulty
              <select className="select" value={task.difficulty} disabled={done} onChange={(e) => patch({ difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.badge} · {d.label} · {d.xp} XP</option>)}
              </select>
            </label>
            <label className="field">Stat
              <select className="select" value={task.stat || ''} onChange={(e) => patch({ stat: e.target.value || null })}>
                <option value="">No stat</option>
                {STATS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">Due
              <input className="input" type="date" value={task.dueDate || ''} onChange={(e) => patch({ dueDate: e.target.value || null })} />
            </label>
            <label className="field">List
              <select className="select" value={task.listId || ''} onChange={(e) => patch({ listId: e.target.value || null })}>
                <option value="">Inbox</option>
                {lists.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
              </select>
            </label>
            <label className="field">Repeat
              <select className="select" value={repeatId(task.repeat)} onChange={(e) => patch({ repeat: REPEAT_OPTIONS.find((o) => o.id === e.target.value)?.rule ?? null })}>
                {REPEAT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                {repeatId(task.repeat) === 'custom' && <option value="custom">Custom schedule</option>}
              </select>
            </label>
            <label className="field">Priority
              <select className="select" value={task.priority} onChange={(e) => patch({ priority: Number(e.target.value) })}>
                <option value={0}>Normal</option><option value={1}>Medium</option><option value={2}>High</option><option value={3}>Urgent</option>
              </select>
            </label>
          </>
        )}
        <label className="field task-detail__wide">Notes
          <textarea className="input task-notes" rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes.trim() !== (task.notes || '') && patch({ notes: notes.trim() || null })} />
        </label>
      </div>
      {task.difficulty === 'boss' && subtaskCount < 3 && !done && (
        <p className="task-hint">A Boss quest pays Boss XP only with 3 or more subtasks. With {subtaskCount}, it pays as Epic.</p>
      )}

      {!task.parentId && (
        <div className="task-detail__block">
          <h3>Subtasks</h3>
          <ul className="task-sublist">
            {subtasks.map((s) => (
              <li key={s._id} className={s.status === 'done' ? 'is-done' : ''}>
                <input type="checkbox" checked={s.status === 'done'} aria-label={`Subtask: ${s.title}`} onChange={() => (s.status === 'done' ? reopen : complete).mutate(s._id)} />
                <span>{s.title}</span>
                <DifficultyBadge difficulty={s.difficulty} />
                <button type="button" className="icon-button" aria-label={`Delete subtask ${s.title}`} onClick={() => remove.mutate(s._id)}><X size={14} /></button>
              </li>
            ))}
          </ul>
          {!done && <AddLine placeholder="Add a subtask" label="New subtask" onAdd={(value) => create.mutate({ title: value, parentId: task._id })} disabled={create.isPending} />}
        </div>
      )}

      {!task.parentId && (
        <div className="task-detail__block">
          <h3>Checklist <span className="task-muted">· 1 XP a step, up to 10</span></h3>
          <ul className="task-sublist">
            {(task.checklist || []).map((c) => (
              <li key={c._id} className={c.done ? 'is-done' : ''}>
                <input type="checkbox" checked={c.done} aria-label={`Step: ${c.text}`} onChange={() => updateItem.mutate({ id: c._id, done: !c.done })} />
                <span>{c.text}</span>
                <button type="button" className="icon-button" aria-label={`Delete step ${c.text}`} onClick={() => removeItem.mutate(c._id)}><X size={14} /></button>
              </li>
            ))}
          </ul>
          <AddLine placeholder="Add a step" label="New checklist step" onAdd={(value) => addItem.mutate({ id: task._id, text: value })} disabled={addItem.isPending} />
        </div>
      )}

      {!task.parentId && (
        <div className="task-detail__block">
          <AttachmentsPanel ownerType="task" ownerId={task._id} />
        </div>
      )}

      <div className="task-detail__foot">
        <button
          type="button"
          className={`btn btn--small ${confirm ? 'btn--danger' : 'btn--quiet'}`}
          onClick={() => (confirm ? remove.mutate(task._id) : setConfirm(true))}
          onBlur={() => setConfirm(false)}
        >
          <Trash size={14} aria-hidden="true" /> {confirm ? 'Click again to delete' : 'Delete'}
        </button>
        {today && task.completedOn && <span className="task-muted">Done {task.completedOn === today ? 'today' : task.completedOn} · {task.xpAwarded} XP</span>}
      </div>
    </div>
  );
}

/** One task row: tick to complete, click the title to open its detail. */
export function TaskItem({ task, today, lists = [], defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const complete = useCompleteTask();
  const reopen = useReopenTask();
  const done = task.status === 'done';
  const due = dueLabel(task.dueDate, today);
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.status === 'done').length;
  const checks = task.checklist || [];
  const checksDone = checks.filter((c) => c.done).length;
  const listName = lists.find((l) => l._id === task.listId)?.name;
  const busy = complete.isPending || reopen.isPending;
  const rowRef = useRef(null);
  useEffect(() => { if (defaultOpen) rowRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [defaultOpen]);

  return (
    <li className={`task${done ? ' is-done' : ''}${open ? ' is-open' : ''}`} ref={rowRef}>
      <div className="task__row">
        <input
          type="checkbox"
          className="task__check"
          checked={done}
          disabled={busy}
          aria-label={done ? `Reopen: ${task.title}` : `Complete: ${task.title}`}
          onChange={() => (done ? reopen : complete).mutate(task._id)}
        />
        <button type="button" className="task__title" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="task__name">{task.title}</span>
          <span className="task__meta">
            {due && <span className={`task-chip is-${due.tone}`}>{due.text}</span>}
            <DifficultyBadge difficulty={task.difficulty} />
            {task.repeat && <span className="task-chip"><Repeat size={12} aria-hidden="true" /> Repeats</span>}
            {subs.length > 0 && <span className="task-chip">{subsDone}/{subs.length} subtasks</span>}
            {checks.length > 0 && <span className="task-chip"><ListChecks size={12} aria-hidden="true" /> {checksDone}/{checks.length}</span>}
            {listName && <span className="task-chip">{listName}</span>}
            {done && task.xpAwarded > 0 && <span className="task-chip is-xp">+{task.xpAwarded} XP</span>}
          </span>
        </button>
        <span className="task__caret" aria-hidden="true">{open ? <CaretDown size={14} /> : <CaretRight size={14} />}</span>
      </div>
      {complete.isError && <p className="import-error" role="alert">{describeError(complete.error)}</p>}
      {open && <TaskDetail task={task} today={today} lists={lists} />}
    </li>
  );
}

export function TaskList({ tasks, today, lists, empty }) {
  if (!tasks.length) return empty ? <p className="task-empty">{empty}</p> : null;
  return <ul className="task-list" role="list">{tasks.map((t) => <TaskItem key={t._id} task={t} today={today} lists={lists} />)}</ul>;
}

/** The "add a quest" bar. */
export function QuickAdd({ today, lists = [], listId = null, autoFocus = false, inputRef }) {
  const create = useCreateTask();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('normal');
  const [due, setDue] = useState('');
  const [stat, setStat] = useState('');
  const [list, setList] = useState(listId || '');
  useEffect(() => setList(listId || ''), [listId]);
  const submit = (e) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    create.mutate(
      { title: value, difficulty, dueDate: due || null, stat: stat || null, listId: list || null },
      { onSuccess: () => setTitle('') },
    );
  };
  const quickDue = (days) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    setDue(d.toISOString().slice(0, 10));
  };
  return (
    <form className="quick-add" onSubmit={submit} aria-label="Add a task">
      <div className="quick-add__main">
        <input ref={inputRef} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a quest, e.g. “Send the invoice”" aria-label="Task title" maxLength={200} autoFocus={autoFocus} />
        <button type="submit" className="btn btn--accent" disabled={create.isPending || !title.trim()}>Add</button>
      </div>
      <div className="quick-add__opts">
        <label className="quick-add__opt">Difficulty
          <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d.id} value={d.id}>{d.badge} · {d.label} ({d.xp} XP)</option>)}
          </select>
        </label>
        <div className="quick-add__opt">
          <label htmlFor="quick-due">Due</label>
          <span className="quick-add__due">
            <input id="quick-due" className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <button type="button" className="chip" onClick={() => quickDue(0)}>Today</button>
            <button type="button" className="chip" onClick={() => quickDue(1)}>Tomorrow</button>
          </span>
        </div>
        <label className="quick-add__opt">Stat
          <select className="select" value={stat} onChange={(e) => setStat(e.target.value)}>
            <option value="">None</option>
            {STATS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        {lists.length > 0 && (
          <label className="quick-add__opt">List
            <select className="select" value={list} onChange={(e) => setList(e.target.value)}>
              <option value="">Inbox</option>
              {lists.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </label>
        )}
      </div>
      {create.isError && <p className="import-error" role="alert">{describeError(create.error)}</p>}
    </form>
  );
}
