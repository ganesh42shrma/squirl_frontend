// The finance widgets. Each one fetches its own data (React Query shares and caches it), so the
// board no longer loads everything centrally; each also has a Preview built from mock data for the
// "Add widget" gallery.
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { financePath } from '../../../app/paths';
import { addDaysKey, localTodayKey } from '../../tasks/taskUtils';
import { useBalances } from '../../insights/useInsights';
import { useSummary, useTransactions, useUnsortedCount } from '../../ledger/useTransactions';
import { formatMoney, todayISO } from '../../../lib/format';
import { monthFigures } from '../../../lib/moneyTypes';
import {
  AccountTiles, Attention, BalanceSection, MonthStats, MonthStatsView, Recent, TotalBalance, Welcome, WhereItWent, WhereItWentView,
} from '../DashboardParts';
import { ChartWidgetView, LiveChartWidget } from '../ChartWidgets';
import { MOCK_DATA, mockChartData } from '../mockDashboard';

const money = (n) => formatMoney(Math.round(n), { rounded: true });

/** The month the board talks about: the month of the latest transaction. */
export function useAnchorMonth() {
  const recent = useTransactions({ limit: 1, sort: '-date' });
  return recent.data?.data?.[0]?.date.slice(0, 7) || todayISO().slice(0, 7);
}

export function QueryState({ query, children }) {
  if (query.isLoading) return <div className="insight-skeleton widget-skeleton" aria-busy="true" />;
  if (query.isError) return <p className="import-error" role="alert">{query.error.message}</p>;
  return children;
}

// ── Overview ────────────────────────────────────────────────────────────────────────
export function OverviewWidget() {
  const q = useBalances();
  return (
    <QueryState query={q}>
      {q.data?.total ? <div className="dash-top"><TotalBalance total={q.data.total} accounts={q.data.accounts} /><AccountTiles accounts={q.data.accounts} /></div> : <Welcome />}
    </QueryState>
  );
}
export const OverviewPreview = () => <div className="dash-top"><TotalBalance total={MOCK_DATA.total} accounts={MOCK_DATA.accounts} /><AccountTiles accounts={MOCK_DATA.accounts} /></div>;

export function AttentionWidget() {
  const q = useBalances();
  const unsorted = useUnsortedCount();
  return <QueryState query={q}><Attention accounts={q.data?.accounts || []} unsorted={unsorted.data || 0} /></QueryState>;
}
export const AttentionPreview = () => <Attention accounts={[]} unsorted={14} />;

export function BalanceWidget({ settings }) {
  const q = useBalances();
  return (
    <QueryState query={q}>
      <BalanceSection key={settings.period} combined={q.data?.combined || []} since={q.data?.total?.since} accounts={q.data?.accounts || []} period={settings.period} />
    </QueryState>
  );
}
export const BalancePreview = ({ settings }) => <BalanceSection combined={MOCK_DATA.combined} since={MOCK_DATA.total.since} accounts={MOCK_DATA.accounts} period={settings.period} />;

export function AccountSplitWidget() {
  const q = useBalances();
  return <QueryState query={q}><LiveChartWidget widget={{ id: 'accountSplit' }} anchor="" accounts={q.data?.accounts || []} /></QueryState>;
}
export const AccountSplitPreview = () => <ChartWidgetView widget={{ id: 'accountSplit' }} {...mockChartData({ id: 'accountSplit', period: 'latest', account: 'all', metric: 'expense' })} preview />;

// ── Month figures and charts ─────────────────────────────────────────────────────────
export const MonthStatsWidget = () => <MonthStats month={useAnchorMonth()} />;
export const MonthStatsPreview = () => <MonthStatsView month={MOCK_DATA.month} now={MOCK_DATA.summary} before={MOCK_DATA.previous} />;

export const WhereItWentWidget = () => <WhereItWent month={useAnchorMonth()} />;
export const WhereItWentPreview = () => <WhereItWentView month={MOCK_DATA.month} data={MOCK_DATA.categories} preview />;

function ChartWidget({ id, settings }) {
  const anchor = useAnchorMonth();
  const balances = useBalances();
  return <LiveChartWidget widget={{ id, ...settings }} anchor={anchor} accounts={balances.data?.accounts || []} />;
}
export const BreakdownWidget = ({ settings }) => <ChartWidget id="breakdown" settings={settings} />;
export const CashflowWidget = ({ settings }) => <ChartWidget id="cashflow" settings={settings} />;
export const TrendWidget = ({ settings }) => <ChartWidget id="trend" settings={settings} />;
const chartPreview = (id) => ({ settings }) => <ChartWidgetView widget={{ id, ...settings }} {...mockChartData({ id, ...settings })} preview />;
export const BreakdownPreview = chartPreview('breakdown');
export const CashflowPreview = chartPreview('cashflow');
export const TrendPreview = chartPreview('trend');

// ── Ledger ──────────────────────────────────────────────────────────────────────────
export function RecentWidget({ settings }) {
  const q = useTransactions({ limit: settings.count, sort: '-date' });
  return <QueryState query={q}><Recent rows={q.data?.data || []} /></QueryState>;
}
export const RecentPreview = ({ settings }) => <Recent rows={MOCK_DATA.rows.slice(0, settings.count)} />;

// Spending over the last N days against the N before, from the ledger's own totals.
function SpendView({ days, now, before, to }) {
  const spent = monthFigures(now?.groups).spent;
  const prior = monthFigures(before?.groups).spent;
  const change = prior ? Math.round(((spent - prior) / prior) * 100) : null;
  const from = addDaysKey(to, -(days - 1));
  return (
    <section className="dash-section" aria-labelledby={`spend-${days}`}>
      <div className="dash-section__head">
        <h2 id={`spend-${days}`}>Spent in {days} days</h2>
        <Link to={financePath('ledger', `?from=${from}&to=${to}&type=debit`)} className="dash-link">Ledger <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <p className="dash-hero__value spend-figure">{money(spent)}</p>
      <p className="insight-muted">
        {change === null ? `Nothing in the ${days} days before.` : change === 0 ? `About the same as the ${days} days before.` : <span className={change > 0 ? 'amount-debit' : 'amount-credit'}>{change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs the {days} days before</span>}
      </p>
    </section>
  );
}
export function SpendWidget({ settings }) {
  const to = localTodayKey();
  const days = Number(settings.days);
  const now = useSummary({ from: addDaysKey(to, -(days - 1)), to, groupBy: 'categoryType' });
  const before = useSummary({ from: addDaysKey(to, -(2 * days - 1)), to: addDaysKey(to, -days), groupBy: 'categoryType' });
  return <QueryState query={now}><SpendView days={days} now={now.data} before={before.data} to={to} /></QueryState>;
}
export const SpendPreview = ({ settings }) => <SpendView days={Number(settings.days)} now={MOCK_DATA.summary} before={MOCK_DATA.previous} to={localTodayKey()} />;
