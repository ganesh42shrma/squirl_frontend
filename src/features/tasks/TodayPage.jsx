import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { describeError } from '../../api/client';
import { tasksPath } from '../../app/paths';
import { QuestWindow } from './QuestWindow';
import { QuickAdd, TaskItem, TaskList } from './TaskItem';
import { RankBadge, SystemWindow, XpBar } from './SystemWindow';
import { useQuest, useTaskLists, useTasksOverview, useToday } from './useTasks';
import './tasks.css';

function Section({ title, count, children, tone }) {
  return (
    <section className={`task-section${tone ? ` is-${tone}` : ''}`} aria-label={title}>
      <h2 className="task-section__title">{title} {count != null && <span className="task-muted">· {count}</span>}</h2>
      {children}
    </section>
  );
}

/** A slim hunter status strip: rank, level and XP, linking to the full profile. */
export function HunterStrip() {
  const { data } = useTasksOverview();
  const p = data?.profile;
  if (!p) return <div className="insight-skeleton hunter-strip-skeleton" />;
  return (
    <SystemWindow as="div" className="hunter-strip">
      <RankBadge rank={p.rank.id} size={44} />
      <div className="hunter-strip__body">
        <p className="hunter-strip__name">
          <span className="sys-num">Lv. {p.level}</span> · {p.rank.name}{p.title ? <span className="sys-muted"> · {p.title.name}</span> : null}
        </p>
        <XpBar fraction={p.fraction} left={p.maxed ? 'Max level' : `${p.xpIntoLevel} / ${p.xpForLevel} XP`} right={`${data.xpToday} XP today`} label="Level progress" />
      </div>
      <Link className="btn btn--quiet btn--small" to={tasksPath('profile')}>Hunter</Link>
    </SystemWindow>
  );
}

export function TodayPage() {
  const [params, setParams] = useSearchParams();
  const today = useToday();
  const quest = useQuest();
  const lists = useTaskLists();
  const inputRef = useRef(null);
  const wantsNew = params.get('new') === '1';

  useEffect(() => {
    if (!wantsNew) return;
    inputRef.current?.focus();
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('new'); return next; }, { replace: true });
  }, [wantsNew, setParams]);

  if (today.isLoading) return <div className="insight-skeleton" />;
  if (today.isError) return <p className="import-error" role="alert">{describeError(today.error)}</p>;
  const d = today.data;
  const listItems = lists.data?.lists || [];
  const dateText = new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const empty = !d.overdue.length && !d.today.length && !d.upcoming.length && !d.someday.total && !d.doneToday.length;

  return (
    <div className="tasks-page">
      <header className="page-head">
        <h1>Today</h1>
        <p>{dateText}. Finish quests, keep your streaks, clear the Daily Quest.</p>
      </header>
      <HunterStrip />
      {quest.isLoading ? <div className="insight-skeleton quest-skeleton" /> : quest.isError ? <p className="import-error" role="alert">{describeError(quest.error)}</p> : <QuestWindow quest={quest.data} />}

      <QuickAdd today={d.date} lists={listItems} inputRef={inputRef} />

      {empty && <p className="task-empty task-empty--big">Nothing on your board yet. Add your first quest above; it pays XP when you finish it.</p>}
      {d.overdue.length > 0 && <Section title="Overdue" count={d.overdue.length} tone="late"><TaskList tasks={d.overdue} today={d.date} lists={listItems} /></Section>}
      {(d.today.length > 0 || !empty) && (
        <Section title="Today" count={d.today.length}>
          <TaskList tasks={d.today} today={d.date} lists={listItems} empty="Nothing due today." />
        </Section>
      )}
      {d.upcoming.length > 0 && <Section title="Coming up this week" count={d.upcoming.length}><TaskList tasks={d.upcoming} today={d.date} lists={listItems} /></Section>}
      {d.someday.total > 0 && (
        <Section title="No due date" count={d.someday.total}>
          <TaskList tasks={d.someday.items} today={d.date} lists={listItems} />
          {d.someday.total > d.someday.items.length && <p className="task-muted">Showing {d.someday.items.length} of {d.someday.total}. <Link to={tasksPath('lists')}>See all in Lists</Link>.</p>}
        </Section>
      )}
      {d.doneToday.length > 0 && (
        <details className="task-done">
          <summary>Done today · {d.doneToday.length}</summary>
          <ul className="task-list" role="list">{d.doneToday.map((t) => <TaskItem key={t._id} task={t} today={d.date} lists={listItems} />)}</ul>
        </details>
      )}
    </div>
  );
}
