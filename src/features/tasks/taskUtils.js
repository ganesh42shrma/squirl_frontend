import { useEffect, useState } from 'react';

const DAY = 86400000;
const parse = (key) => Date.parse(`${key}T00:00:00Z`);

export const addDaysKey = (key, n) => new Date(parse(key) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / DAY);

/** "Today", "Tomorrow", "Yesterday", "3 days late", "Fri 21 Nov": how a due date reads next to a task. */
export function dueLabel(dueDate, today) {
  if (!dueDate) return null;
  const diff = daysBetween(today, dueDate);
  if (diff === 0) return { text: 'Today', tone: 'today' };
  if (diff === 1) return { text: 'Tomorrow', tone: 'soon' };
  if (diff === -1) return { text: 'Yesterday', tone: 'late' };
  if (diff < 0) return { text: `${-diff} days late`, tone: 'late' };
  const date = new Date(parse(dueDate)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  return { text: date, tone: diff <= 7 ? 'soon' : 'later' };
}

/** "3h 12m", "45m", "closed": time left until an ISO moment. Re-renders every 30 seconds. */
export function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!iso) return '';
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return 'closing';
  const minutes = Math.floor(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export const REPEAT_OPTIONS = [
  { id: '', label: 'Doesn’t repeat', rule: null },
  { id: 'daily', label: 'Every day', rule: { freq: 'daily', interval: 1 } },
  { id: 'weekly', label: 'Every week', rule: { freq: 'weekly', interval: 1 } },
  { id: 'monthly', label: 'Every month', rule: { freq: 'monthly', interval: 1 } },
];
export const repeatId = (rule) => (rule && !rule.days?.length && rule.interval === 1 ? rule.freq : rule ? 'custom' : '');

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Plain-English cadence: "Every day", "3 times a week", "Mon, Wed, Fri". */
export function cadenceText(habit) {
  switch (habit.cadence) {
    case 'daily': return 'Every day';
    case 'weekdays': {
      const days = WEEKDAYS.filter((_, i) => (habit.daysMask >> i) & 1);
      return days.length === 5 && !((habit.daysMask >> 5) & 1) && !((habit.daysMask >> 6) & 1) ? 'Weekdays' : days.join(', ');
    }
    case 'times_per_week': return `${habit.targetPerPeriod} time${habit.targetPerPeriod === 1 ? '' : 's'} a week`;
    case 'times_per_month': return `${habit.targetPerPeriod} time${habit.targetPerPeriod === 1 ? '' : 's'} a month`;
    case 'every_n_days': return `Every ${habit.everyN} days`;
    default: return '';
  }
}

/** The unit a streak counts in for each cadence. */
export const streakUnit = (habit, n) => {
  const unit = { times_per_week: 'week', times_per_month: 'month', every_n_days: 'round' }[habit.cadence] || 'day';
  return `${unit}${n === 1 ? '' : 's'}`;
};

/** Today in the browser's clock; the server's own day key (useToday) is preferred when it is loaded. */
export function localTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
