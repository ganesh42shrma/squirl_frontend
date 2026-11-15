// Payments, Goals and Highlights widgets.
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb } from '@phosphor-icons/react';
import { financePath, goalPath } from '../../../app/paths';
import { useCommitments } from '../../commitments/useCommitments';
import { useGoals } from '../../goals/useGoals';
import { GoalProgress, TrackBadge } from '../../goals/GoalsPage';
import { useHistory } from '../../insights/useInsights';
import { maskFinancialText } from '../../../lib/guestMode';
import { formatMoney } from '../../../lib/format';
import { ComingUpView } from '../DashboardParts';
import { widgetRange } from '../dashboardConfig';
import { MOCK_DATA } from '../mockDashboard';
import { QueryState, useAnchorMonth } from './FinanceWidgets';

const money = (n) => formatMoney(Math.round(n), { rounded: true });

// ── Payments ────────────────────────────────────────────────────────────────────────
export function ComingUpWidget() {
  const q = useCommitments();
  return <QueryState query={q}><ComingUpView data={q.data} /></QueryState>;
}
export const ComingUpPreview = () => <ComingUpView data={MOCK_DATA.commitments} />;

function CommitmentTotals({ data }) {
  const active = (data?.items || []).filter((i) => i.active);
  return (
    <section className="dash-section" aria-labelledby="monthly-title">
      <div className="dash-section__head">
        <h2 id="monthly-title">Fixed each month</h2>
        <Link to={financePath('payments')} className="dash-link">EMIs &amp; bills <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      {active.length ? (
        <>
          <p className="dash-hero__value spend-figure">{money(data.totals.monthly)}</p>
          <p className="insight-muted">across {active.length} EMI{active.length === 1 ? '' : 's'}, bill{active.length === 1 ? '' : 's'} and subscription{active.length === 1 ? '' : 's'}.</p>
        </>
      ) : <p className="insight-muted">No EMIs or bills yet.</p>}
    </section>
  );
}
export function MonthlyCommitmentsWidget() {
  const q = useCommitments();
  return <QueryState query={q}><CommitmentTotals data={q.data} /></QueryState>;
}
export const MonthlyCommitmentsPreview = () => <CommitmentTotals data={MOCK_DATA.commitments} />;

// ── Goals ───────────────────────────────────────────────────────────────────────────
const MOCK_GOALS = [
  { _id: 'mock-g1', name: 'Emergency fund', status: 'active', progress: 62, saved: 186000, priceNow: 300000, track: { status: 'on_track' }, monthlyNeeded: 12000 },
  { _id: 'mock-g2', name: 'New laptop', status: 'active', progress: 35, saved: 42000, priceNow: 120000, track: { status: 'behind' }, monthlyNeeded: 9000 },
];

function GoalsView({ goals, preview = false }) {
  return (
    <section className="dash-section" aria-labelledby="goals-widget-title">
      <div className="dash-section__head">
        <h2 id="goals-widget-title">Goals</h2>
        <Link to={financePath('goals')} className="dash-link">All goals <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      {goals.length === 0 ? <p className="insight-muted">No active goals yet.</p> : (
        <ul className="widget-goals">
          {goals.map((g) => (
            <li key={g._id}>
              <div className="widget-goals__head">
                {preview ? <span>{g.name}</span> : <Link to={goalPath(g._id)}>{maskFinancialText(g.name)}</Link>}
                <TrackBadge status={g.status === 'achieved' ? 'reached' : g.track.status} />
              </div>
              <GoalProgress goal={g} />
              <p className="insight-muted">{money(g.monthlyNeeded)} a month needed</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function GoalProgressWidget({ settings }) {
  const q = useGoals();
  const all = (q.data?.items || []).filter((g) => g.status !== 'achieved');
  const goals = settings.goalId === 'all' ? all.slice(0, Number(settings.count)) : all.filter((g) => g._id === settings.goalId);
  return <QueryState query={q}><GoalsView goals={goals} /></QueryState>;
}
export const GoalProgressPreview = ({ settings }) => <GoalsView goals={MOCK_GOALS.slice(0, Number(settings.count))} preview />;

// ── Highlights ──────────────────────────────────────────────────────────────────────
const MOCK_HIGHLIGHTS = [
  { id: 'a', title: 'Biggest category', value: 'Housing · ₹16,000', detail: '43% of what you spent.' },
  { id: 'b', title: 'Saved this month', value: '₹44,800', detail: '47% of what came in.' },
  { id: 'c', title: 'Largest single row', value: '₹14,600', detail: 'Car EMI on 12 Oct.' },
];

function HighlightsView({ items }) {
  return (
    <section className="dash-section" aria-labelledby="highlights-widget-title">
      <div className="dash-section__head">
        <h2 id="highlights-widget-title"><Lightbulb size={18} weight="duotone" aria-hidden="true" /> Highlights</h2>
        <Link to={financePath('highlights')} className="dash-link">More <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      {items.length === 0 ? <p className="insight-muted">Highlights appear once you have a few months of statements.</p> : (
        <ul className="highlights highlights--compact" aria-label="Highlights">
          {items.map((item) => (
            <li key={item.id} className="highlight">
              <p className="highlight__title">{item.title}</p>
              <p className="highlight__value">{maskFinancialText(item.value)}</p>
              <p className="highlight__detail">{maskFinancialText(item.detail)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function HighlightsWidget({ settings }) {
  const anchor = useAnchorMonth();
  const q = useHistory(widgetRange({ period: '3m', account: 'all' }, anchor));
  return <QueryState query={q}><HighlightsView items={(q.data?.highlights || []).slice(0, Number(settings.count))} /></QueryState>;
}
export const HighlightsPreview = ({ settings }) => <HighlightsView items={MOCK_HIGHLIGHTS.slice(0, Number(settings.count))} />;
