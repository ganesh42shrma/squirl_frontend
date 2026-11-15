import { useState } from 'react';
import { PencilSimple, Plus, Trash, Tray } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { useDebouncedValue } from '../../lib/hooks';
import { QuickAdd, TaskList } from './TaskItem';
import { localTodayKey } from './taskUtils';
import { useCreateList, useDeleteList, useTaskItems, useTaskLists, useToday, useUpdateList } from './useTasks';
import './tasks.css';

function ListTasks({ listId, status, search, lists, today }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = useTaskItems({ list: listId, status, search: search || undefined, page, limit: 30 });
  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error" role="alert">{describeError(error)}</p>;
  const meta = data.meta;
  return (
    <>
      <TaskList tasks={data.data} today={today} lists={lists} empty={search ? 'Nothing matches that search.' : status === 'done' ? 'Nothing finished here yet.' : 'This list is clear.'} />
      {meta.pages > 1 && (
        <nav className="task-pager" aria-label="Task pages">
          <button type="button" className="btn btn--quiet btn--small" disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="task-muted" role="status">Page {meta.page} of {meta.pages} · {meta.total} tasks</span>
          <button type="button" className="btn btn--quiet btn--small" disabled={page >= meta.pages || isFetching} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </>
  );
}

export function ListsPage() {
  const { data, isLoading, isError, error } = useTaskLists();
  const todayQuery = useToday();
  const today = todayQuery.data?.date || localTodayKey();
  const create = useCreateList();
  const rename = useUpdateList();
  const remove = useDeleteList();
  const [selected, setSelected] = useState('inbox');
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const debounced = useDebouncedValue(search, 300);

  if (isLoading) return <div className="insight-skeleton" />;
  if (isError) return <p className="import-error" role="alert">{describeError(error)}</p>;
  const lists = data.lists;
  const current = selected === 'inbox' ? null : lists.find((l) => l._id === selected);
  const effective = current ? selected : 'inbox';

  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim() }, { onSuccess: (list) => { setName(''); setSelected(list._id); } });
  };

  return (
    <div className="tasks-page">
      <header className="page-head"><h1>Lists</h1><p>Group quests by area of life or project. Anything without a list lands in the Inbox.</p></header>
      <div className="lists-layout">
        <aside className="lists-side" aria-label="Your lists">
          <ul role="list" className="lists-nav">
            <li><button type="button" aria-pressed={effective === 'inbox'} className={effective === 'inbox' ? 'is-active' : ''} onClick={() => setSelected('inbox')}><Tray size={16} aria-hidden="true" /> Inbox <span className="task-muted">{data.inbox.open}</span></button></li>
            {lists.map((l) => (
              <li key={l._id}><button type="button" aria-pressed={effective === l._id} className={effective === l._id ? 'is-active' : ''} onClick={() => setSelected(l._id)}>{l.name} <span className="task-muted">{l.open}</span></button></li>
            ))}
          </ul>
          <form className="task-addline" onSubmit={add}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New list" aria-label="New list name" maxLength={60} />
            <button type="submit" className="btn btn--quiet btn--small" disabled={!name.trim() || create.isPending} aria-label="Add list"><Plus size={14} /></button>
          </form>
          {create.isError && <p className="import-error" role="alert">{describeError(create.error)}</p>}
        </aside>
        <div className="lists-main">
          <div className="lists-main__head">
            {editing === effective && current ? (
              <form className="task-addline" onSubmit={(e) => { e.preventDefault(); rename.mutate({ id: current._id, name: e.currentTarget.elements.name.value.trim() }, { onSuccess: () => setEditing(null) }); }}>
                <input name="name" className="input" defaultValue={current.name} maxLength={60} aria-label="List name" autoFocus />
                <Button type="submit" size="small">Save</Button>
                <Button variant="quiet" size="small" onClick={() => setEditing(null)}>Cancel</Button>
              </form>
            ) : (
              <h2>{current ? current.name : 'Inbox'}</h2>
            )}
            {current && editing !== effective && (
              <span className="lists-main__tools">
                <button type="button" className="icon-button" aria-label={`Rename ${current.name}`} onClick={() => setEditing(effective)}><PencilSimple size={15} /></button>
                <button type="button" className={`btn btn--small ${confirm ? 'btn--danger' : 'btn--quiet'}`} onBlur={() => setConfirm(false)} onClick={() => (confirm ? remove.mutate(current._id, { onSuccess: () => { setSelected('inbox'); setConfirm(false); } }) : setConfirm(true))}>
                  <Trash size={14} aria-hidden="true" /> {confirm ? 'Delete list (tasks go to Inbox)' : 'Delete'}
                </button>
              </span>
            )}
          </div>
          <QuickAdd today={today} lists={lists} listId={current?._id || null} />
          <div className="lists-filters">
            <div className="chip-group" role="group" aria-label="Show">
              {[['open', 'Open'], ['done', 'Done'], ['all', 'All']].map(([id, label]) => (
                <button key={id} type="button" className={`chip${status === id ? ' is-active' : ''}`} aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>
              ))}
            </div>
            <input className="input lists-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
          </div>
          <ListTasks key={`${effective}-${status}-${debounced}`} listId={effective} status={status} search={debounced} lists={lists} today={today} />
        </div>
      </div>
    </div>
  );
}
