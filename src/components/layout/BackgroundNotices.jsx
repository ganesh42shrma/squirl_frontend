import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkle } from '@phosphor-icons/react';
import { useToast } from '../ui/Toast';
import { useLlmStatus, useSuggestionStatus } from '../../features/insights/useInsights';
import { useCommitmentAlerts } from '../../features/commitments/useCommitments';
import { formatDate, formatMoney, todayISO } from '../../lib/format';
import { useWatchFamilySync } from '../../features/auth/useAuth';

const SEEN_KEY = 'squirl-seen-alerts';
const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

// Alerts already shown today (per browser), so a reminder appears once a day, not on every page.
function seenToday() {
  try {
    const saved = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    return saved.date === todayISO() ? new Set(saved.keys) : new Set();
  } catch {
    return new Set();
  }
}
function markSeen(keys) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ date: todayISO(), keys: [...keys] }));
  } catch {
    /* storage blocked: reminders may repeat */
  }
}

/**
 * Things happening in the background, on every screen:
 *   - the category-suggestion job: a progress pill while it runs, and a toast when it's done;
 *   - EMIs and bills due soon or missed: a toast, once a day each.
 */
export function BackgroundNotices() {
  useWatchFamilySync();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const model = useLlmStatus();
  const { data: job } = useSuggestionStatus();
  const { data: alerts } = useCommitmentAlerts();
  const queryClient = useQueryClient();
  const completedRun = useRef(null);
  const onSortOut = location.pathname === '/app/sort-out';

  // Refresh even when a fast run finishes between polls.
  useEffect(() => {
    if (!job?.lastRunAt || job.running || completedRun.current === job.lastRunAt) return;
    completedRun.current = job.lastRunAt;
    ['transactions', 'summary', 'insights', 'rules', 'tags', 'profile'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    if (job.autoApplied > 0 && !onSortOut) toast(`Categorized ${plural(job.autoApplied, 'row')}.`);
  }, [job, onSortOut, toast, queryClient]);

  // Due-soon and missed payments.
  useEffect(() => {
    if (!alerts?.length) return;
    const seen = seenToday();
    const fresh = alerts.filter((a) => !seen.has(a.key));
    if (!fresh.length) return;
    for (const a of fresh.slice(0, 3)) {
      const amount = a.amount ? ` ${formatMoney(a.amount)}` : '';
      const message =
        a.type === 'missed'
          ? `No payment found for ${a.name}${amount}, due ${formatDate(a.date)}.`
          : `${a.name}${amount} is due ${a.daysUntil === 0 ? 'today' : a.daysUntil === 1 ? 'tomorrow' : `in ${a.daysUntil} days`} (${formatDate(a.date)}).`;
      toast(message, { tone: a.type === 'missed' ? 'error' : 'info', duration: 10000, action: { label: 'View', onClick: () => navigate('/app/payments') } });
    }
    markSeen(new Set([...seen, ...fresh.map((a) => a.key)]));
  }, [alerts, toast, navigate]);

  if (!job?.running || onSortOut || !model.data?.available) return null;
  return (
    <div className="bg-notice" role="status">
      <Sparkle size={16} weight="duotone" aria-hidden="true" className="bg-notice__icon" />
      <span>
        Categorizing payments…
      </span>
      <span className="bg-notice__bar" aria-hidden="true">
        <span style={{ width: `${job.total ? Math.round(((job.done || 0) / job.total) * 100) : 0}%` }} />
      </span>
      <Link to="/app/sort-out">View</Link>
    </div>
  );
}
