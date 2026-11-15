// Tasks widgets: the System-window look, over the same Tasks hooks the Tasks pages use. They
// render inside a card that drops its own padding (see dashboard.css [data-module='tasks']).
import { Link } from 'react-router-dom';
import { Check, Fire, Medal } from '@phosphor-icons/react';
import { tasksPath } from '../../../app/paths';
import { QuestWindow } from '../../tasks/QuestWindow';
import { XpHeatmap } from '../../tasks/HunterPage';
import { RankBadge, SystemWindow, XpBar } from '../../tasks/SystemWindow';
import { dueLabel, localTodayKey, streakUnit } from '../../tasks/taskUtils';
import { useCheckIn, useCompleteTask, useHabits, useTasksOverview, useToday, useUndoCheckIn } from '../../tasks/useTasks';
import '../../tasks/tasks.css';
import { QueryState } from './FinanceWidgets';

const MOCK_PROFILE = { level: 14, rank: { id: 'D', name: 'D-Rank' }, title: { name: 'Kindling' }, fraction: 0.62, xpIntoLevel: 372, xpForLevel: 600, xpToNext: 228, chain: 9, maxed: false };
const MOCK_QUEST = {
  date: '2026-11-14', status: 'open', total: 4, done: 2, chain: 9, longestChain: 21, penalty: null, rewardXp: 50, closesAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
  items: [{ key: 'a', type: 'custom', title: 'Move for 20 minutes', done: true }, { key: 'b', type: 'habit', refId: 'h1', title: 'Read 20 pages', done: true }, { key: 'c', type: 'custom', title: 'Review today’s spending', done: false }, { key: 'd', type: 'custom', title: 'Plan tomorrow', done: false }],
};

// ── Hunter card ─────────────────────────────────────────────────────────────────────
function HunterCardView({ profile, xpToday }) {
  return (
    <SystemWindow title="HUNTER" className="widget-system">
      <div className="widget-hunter">
        <RankBadge rank={profile.rank.id} size={56} />
        <div className="widget-hunter__body">
          <p className="hunter-strip__name"><span className="sys-num">Lv. {profile.level}</span> · {profile.rank.name}</p>
          {profile.title && <p className="sys-muted">{profile.title.name}</p>}
        </div>
      </div>
      <XpBar fraction={profile.fraction} left={profile.maxed ? 'Max level' : `${profile.xpIntoLevel} / ${profile.xpForLevel} XP`} right={xpToday != null ? `${xpToday} today` : ''} label="Level progress" />
      <p className="widget-hunter__foot"><Fire size={14} weight="duotone" aria-hidden="true" /> <span className="sys-num">{profile.chain}</span> day chain <Link to={tasksPath('profile')} className="widget-link">Hunter →</Link></p>
    </SystemWindow>
  );
}
export function HunterCardWidget() {
  const q = useTasksOverview();
  return <QueryState query={q}><HunterCardView profile={q.data?.profile} xpToday={q.data?.xpToday} /></QueryState>;
}
export const HunterCardPreview = () => <HunterCardView profile={MOCK_PROFILE} xpToday={140} />;

// ── Daily Quest ─────────────────────────────────────────────────────────────────────
export function DailyQuestWidget() {
  const q = useTasksOverview();
  return <QueryState query={q}><div className="widget-quest"><QuestWindow quest={q.data?.quest} /></div></QueryState>;
}
export const DailyQuestPreview = () => <div className="widget-quest"><QuestWindow quest={MOCK_QUEST} /></div>;

// ── Today's quests ──────────────────────────────────────────────────────────────────
const MOCK_TODAY = { date: '2026-11-14', overdue: [{ _id: 'o1', title: 'File GST return', difficulty: 'hard', dueDate: '2026-11-12', status: 'open' }], today: [{ _id: 't1', title: 'Pay credit card bill', difficulty: 'normal', dueDate: '2026-11-14', status: 'open' }, { _id: 't2', title: 'Book dentist', difficulty: 'easy', dueDate: '2026-11-14', status: 'open' }], doneToday: [] };

function TodayView({ data, limit, preview = false }) {
  const complete = useCompleteTask();
  const rows = [...data.overdue, ...data.today].slice(0, limit);
  const remaining = data.overdue.length + data.today.length;
  return (
    <SystemWindow title="TODAY’S QUESTS" className="widget-system" actions={<span className="sys-muted sys-num">{remaining} open</span>}>
      {rows.length === 0 ? <p className="sys-muted">{data.doneToday.length ? 'Everything due is done. Nice.' : 'Nothing due today.'}</p> : (
        <ul className="widget-tasks" role="list">
          {rows.map((t) => {
            const due = dueLabel(t.dueDate, data.date);
            return (
              <li key={t._id}>
                <label>
                  <input type="checkbox" checked={false} disabled={preview || complete.isPending} onChange={() => complete.mutate(t._id)} aria-label={`Complete: ${t.title}`} />
                  <span>{t.title}</span>
                  {due?.tone === 'late' && <span className="widget-tasks__late">{due.text}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="widget-hunter__foot">{remaining > rows.length ? `+${remaining - rows.length} more · ` : ''}<Link to={tasksPath('today')} className="widget-link">Open Today →</Link></p>
    </SystemWindow>
  );
}
export function TodayTasksWidget({ settings }) {
  const q = useToday();
  return <QueryState query={q}><TodayView data={q.data} limit={Number(settings.count)} /></QueryState>;
}
export const TodayTasksPreview = ({ settings }) => <TodayView data={MOCK_TODAY} limit={Number(settings.count)} preview />;

// ── Streaks ─────────────────────────────────────────────────────────────────────────
const MOCK_HABITS = [
  { _id: 'h1', name: 'Read 20 pages', cadence: 'daily', currentStreak: 12, doneToday: true, scheduledToday: true, freezesHeld: 1 },
  { _id: 'h2', name: 'Walk 8,000 steps', cadence: 'daily', currentStreak: 5, doneToday: false, scheduledToday: true, freezesHeld: 0 },
  { _id: 'h3', name: 'No-spend day', cadence: 'times_per_week', currentStreak: 3, doneToday: false, scheduledToday: true, freezesHeld: 0 },
];

function StreaksView({ habits, today, limit, preview = false }) {
  const checkIn = useCheckIn();
  const undo = useUndoCheckIn();
  const rows = [...habits].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, limit);
  return (
    <SystemWindow title="STREAKS" className="widget-system">
      {rows.length === 0 ? <p className="sys-muted">No habits yet. <Link to={tasksPath('habits', '?new=1')} className="widget-link">Start one →</Link></p> : (
        <ul className="widget-streaks" role="list">
          {rows.map((h) => (
            <li key={h._id}>
              <span className="widget-streaks__name">{h.name}</span>
              <span className="sys-num widget-streaks__count"><Fire size={14} weight={h.currentStreak ? 'fill' : 'regular'} aria-hidden="true" /> {h.currentStreak}<span className="sys-muted"> {streakUnit(h, h.currentStreak)}</span></span>
              {h.scheduledToday && (
                <button type="button" className={`widget-check${h.doneToday ? ' is-done' : ''}`} disabled={preview || checkIn.isPending || undo.isPending} aria-pressed={h.doneToday} aria-label={h.doneToday ? `Undo today: ${h.name}` : `Check in: ${h.name}`} onClick={() => (h.doneToday ? undo.mutate({ id: h._id, date: today }) : checkIn.mutate({ id: h._id }))}>
                  <Check size={14} weight="bold" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="widget-hunter__foot"><Link to={tasksPath('habits')} className="widget-link">All streaks →</Link></p>
    </SystemWindow>
  );
}
export function StreaksWidget({ settings }) {
  const q = useHabits();
  return <QueryState query={q}><StreaksView habits={q.data || []} today={localTodayKey()} limit={Number(settings.count)} /></QueryState>;
}
export const StreaksPreview = ({ settings }) => <StreaksView habits={MOCK_HABITS} today="2026-11-14" limit={Number(settings.count)} preview />;

// ── Activity heatmap ────────────────────────────────────────────────────────────────
export const ActivityWidget = () => <SystemWindow title="XP ACTIVITY" className="widget-system"><XpHeatmap /></SystemWindow>;
export function ActivityPreview() {
  const cells = Array.from({ length: 84 }, (_, i) => Math.max(0, Math.round(Math.sin(i / 5) * 2 + 2 + (i % 7 === 0 ? -2 : 0))));
  return (
    <SystemWindow title="XP ACTIVITY" className="widget-system">
      <div className="xp-heat" aria-hidden="true">{cells.map((l, i) => <span key={i} className={`xp-heat__cell lvl-${Math.min(4, l)}`} />)}</div>
      <p className="sys-xp__label"><span>Sample activity</span></p>
    </SystemWindow>
  );
}

// ── Recent awards ───────────────────────────────────────────────────────────────────
const MOCK_AWARDS = [{ id: 'a', name: 'Kindling', rarity: 'common' }, { id: 'b', name: 'Quest Log', rarity: 'common' }, { id: 'c', name: 'First Step', rarity: 'common' }];
function AwardsView({ awards }) {
  return (
    <SystemWindow title="RECENT AWARDS" tone="violet" className="widget-system">
      {awards.length === 0 ? <p className="sys-muted">No awards yet. Finish a quest to earn your first.</p> : (
        <ul className="widget-streaks" role="list">
          {awards.map((a) => <li key={a.id}><span className="widget-streaks__name"><Medal size={14} weight="fill" aria-hidden="true" /> {a.name}</span><span className="sys-muted">{a.rarity}</span></li>)}
        </ul>
      )}
      <p className="widget-hunter__foot"><Link to={tasksPath('awards')} className="widget-link">All awards →</Link></p>
    </SystemWindow>
  );
}
export function AwardsWidget() {
  const q = useTasksOverview();
  return <QueryState query={q}><AwardsView awards={q.data?.recentAwards || []} /></QueryState>;
}
export const AwardsPreview = () => <AwardsView awards={MOCK_AWARDS} />;
