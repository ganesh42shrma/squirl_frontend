import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Question, Warning } from '@phosphor-icons/react';
import { BalanceChart, Sparkline } from '../../components/charts/BalanceChart';
import { CountUp } from '../../components/fx/CountUp';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { GrowingAcorns } from '../../components/illustrations/Sketches';
import { useSummary } from '../ledger/useTransactions';
import { useCommitments } from '../commitments/useCommitments';
import { daysSince, formatAccount, formatDate, formatDay, formatMoney, formatMonth, monthRange, shiftMonth } from '../../lib/format';
import { MONEY_TYPES, monthFigures } from '../../lib/moneyTypes';
import '../../components/layout/layout.css';
import '../insights/insights.css';
import './dashboard.css';

const money = (n) => formatMoney(Math.round(n), { rounded: true });
const STALE_DAYS = 35; // a monthly statement is overdue after this

const RANGES = [
  { id: '1m', label: '1M', days: 31 },
  { id: '3m', label: '3M', days: 92 },
  { id: '6m', label: '6M', days: 183 },
  { id: '1y', label: '1Y', days: 366 },
  { id: 'all', label: 'All', days: null },
];

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Hero: money across your accounts ────────────────────────────────── */
export function TotalBalance({ total, accounts }) {
  const format = useCallback((n) => money(n), []);
  const change = total.change30;

  return (
    <section className="dash-hero" aria-labelledby="total-title">
      <h2 id="total-title" className="dash-eyebrow">
        {accounts.length > 1 ? 'Across your accounts' : `In your ${formatAccount(accounts[0].account)} account`}
      </h2>
      <p className="dash-hero__value">
        <CountUp value={total.balance} format={format} />
      </p>
      <p className="dash-hero__meta">
        {change !== null && change !== 0 && (
          <span className={change > 0 ? 'amount-credit' : 'amount-debit'}>
            {change > 0 ? '+' : '−'}
            {money(Math.abs(change))} in the last 30 days.{' '}
          </span>
        )}
        As of {formatDate(total.asOf)}, from your statements.
      </p>
    </section>
  );
}

export function AccountTiles({ accounts }) {
  return (
    <ul className="account-tiles" aria-label="Accounts">
      {accounts.map((a) => {
        const age = daysSince(a.asOf);
        return (
          <li key={a.account} className="account-tile">
            <div className="account-tile__text">
              <p className="account-tile__name">{formatAccount(a.account)}</p>
              <p className="account-tile__value">{money(a.balance)}</p>
              <p className={`account-tile__meta${age > STALE_DAYS || a.gaps.length ? ' is-warning' : ''}`}>
                {a.gaps.length ? `${a.gaps.length} gap${a.gaps.length === 1 ? '' : 's'} in history` : `Up to ${formatDay(a.asOf)}`}
              </p>
            </div>
            <Sparkline points={a.points.slice(-60)} />
          </li>
        );
      })}
    </ul>
  );
}

/* ── Things worth doing next ─────────────────────────────────────────── */
export function Attention({ accounts, unsorted }) {
  const items = [];
  for (const a of accounts) {
    for (const gap of a.gaps) {
      items.push({
        key: `${a.account}-${gap.from}`,
        text: `${formatAccount(a.account)} is missing transactions between ${formatDate(gap.from)} and ${formatDate(gap.to)}, so its balance doesn’t add up there. Import a statement that covers those dates.`,
        to: '/app/imports',
        action: 'Import',
      });
    }
    const age = daysSince(a.asOf);
    if (age > STALE_DAYS) {
      items.push({
        key: `${a.account}-stale`,
        text: `${formatAccount(a.account)} is only up to date to ${formatDate(a.asOf)} (${age} days ago).`,
        to: '/app/imports',
        action: 'Import a newer statement',
      });
    }
  }
  if (unsorted > 0) {
    items.push({
      key: 'unsorted',
      text: `${unsorted} row${unsorted === 1 ? ' is' : 's are'} waiting for a category across all dates and accounts, so spending by category isn’t complete yet.`,
      to: '/app/sort-out',
      action: 'Sort them',
    });
  }
  if (!items.length) return <section className="dash-section"><h2>Needs attention</h2><p className="insight-muted">All caught up.</p></section>;

  return (
    <section className="attention" aria-labelledby="attention-title">
      <h2 id="attention-title" className="visually-hidden">
        Needs attention
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <Warning size={18} weight="duotone" aria-hidden="true" className="attention__icon" />
            <p>{item.text}</p>
            <Link to={item.to} className="btn btn--quiet btn--small">
              {item.action}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Balance over time, with a range filter above it ─────────────────── */
export function BalanceSection({ combined, since, accounts, period = '6m' }) {
  const [range, setRange] = useState(period === '12m' ? '1y' : period === 'latest' ? '1m' : period);
  const days = RANGES.find((r) => r.id === range).days;
  const points = useMemo(() => {
    if (!days || !combined.length) return combined;
    const end = Date.parse(combined[combined.length - 1].date);
    const cutoff = range === '1m' ? `${combined[combined.length - 1].date.slice(0, 7)}-01` : new Date(end - days * 86400000).toISOString().slice(0, 10);
    return combined.filter((p) => p.date >= cutoff);
  }, [combined, days, range]);

  return (
    <section className="dash-section dash-section--wide" aria-labelledby="balance-title">
      <div className="dash-section__head">
        <h2 id="balance-title">Balance over time</h2>
        <div className="chip-group" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className={`chip${range === r.id ? ' is-active' : ''}`} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {accounts.length > 1 && since && (
        <p className="dash-note">
          {accounts.map((a) => formatAccount(a.account)).join(' and ')} combined, from {formatDate(since)}, when every account has statement data.
        </p>
      )}
      <BalanceChart points={points} label="Combined balance over time" />
    </section>
  );
}

/* ── The latest month in figures, against the month before ───────────── */
function Delta({ now, before, upIsGood }) {
  if (!before) return <span className="stat__delta">Nothing the month before</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="stat__delta">About the same as the month before</span>;
  const good = pct > 0 === upIsGood;
  return (
    <span className={`stat__delta ${good ? 'amount-credit' : 'amount-debit'}`}>
      {pct > 0 ? '▲' : '▼'} {Math.abs(pct)}% vs the month before
    </span>
  );
}

export function MonthStats({ month }) {
  const { data: now } = useSummary({ ...monthRange(month), groupBy: 'categoryType' });
  const { data: before } = useSummary({ ...monthRange(shiftMonth(month, -1)), groupBy: 'categoryType' });
  return <MonthStatsView month={month} now={now} before={before} />;
}

export function MonthStatsView({ month, now, before }) {
  const f = monthFigures(now?.groups);
  const p = monthFigures(before?.groups);
  const stats = [
    { type: 'expense', label: 'Spent', value: f.spent, prev: p.spent, upIsGood: false },
    { type: 'income', label: 'Earned', value: f.earned, prev: p.earned, upIsGood: true },
    { type: 'investment', label: 'Invested', value: f.invested, prev: p.invested, upIsGood: true },
  ];
  const leftOver = f.earned - f.spent - f.invested;

  return (
    <section className="dash-section dash-section--wide" aria-labelledby="month-title">
      <div className="dash-section__head">
        <h2 id="month-title">{formatMonth(month)}</h2>
        <Link to={`/app/highlights?month=${month}`} className="dash-link">
          Month in detail <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <dl className="stats">
        {stats.map((s) => (
          <div key={s.type} className="stat">
            <dt>
              <span className="figure__marker" style={{ background: MONEY_TYPES[s.type].viz }} aria-hidden="true" />
              {s.label}
            </dt>
            <dd>
              <span className="stat__value">{money(s.value)}</span>
              <Delta now={s.value} before={s.prev} upIsGood={s.upIsGood} />
            </dd>
          </div>
        ))}
        <div className="stat">
          <dt>Left over</dt>
          <dd>
            <span className={`stat__value ${leftOver < 0 ? 'amount-debit' : ''}`}>{money(leftOver)}</span>
            <span className="stat__delta">{f.earned > 0 ? `${Math.round((leftOver / f.earned) * 100)}% of what came in` : 'Nothing earned yet'}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function WhereItWent({ month }) {
  const { data } = useSummary({ ...monthRange(month), groupBy: 'topCategory' });
  return <WhereItWentView month={month} data={data} />;
}

export function WhereItWentView({ month, data, preview = false }) {
  const rows = (data?.groups || [])
    .filter((g) => g.categoryType === 'expense' || g.key === null)
    .map((g) => ({ ...g, value: g.key === null ? g.debit : g.debit - g.credit }))
    .filter((g) => g.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const max = rows[0]?.value || 1;

  return (
    <section className="dash-section" aria-labelledby="where-title">
      <div className="dash-section__head">
        <h2 id="where-title">Where it went</h2>
      </div>
      {rows.length === 0 ? (
        <p className="insight-muted">No spending in {formatMonth(month)}.</p>
      ) : (
        <ol className="spend-bars spend-bars--compact">
          {rows.map((row) => (
            <li key={row.key ?? 'none'}>
              <Link to={`/app/ledger?month=${month}&category=${row.key ?? 'none'}`} className="spend-bar" title={`${row.count} transaction${row.count === 1 ? '' : 's'}`}>
                <span className="spend-bar__label">
                  {row.key === null || preview ? <Question size={18} weight="duotone" aria-hidden="true" /> : <CategoryIcon id={row.key} />}
                  <span>{row.key === null ? 'Not sorted yet' : row.label}</span>
                </span>
                <span className="spend-bar__track" aria-hidden="true">
                  <span className={`spend-bar__fill${row.key === null ? ' is-unsorted' : ''}`} style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
                </span>
                <span className="spend-bar__value num">{money(row.value)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function Recent({ rows }) {
  return (
    <section className="dash-section" aria-labelledby="recent-title">
      <div className="dash-section__head">
        <h2 id="recent-title">Latest rows</h2>
        <Link to="/app/ledger" className="dash-link">
          Ledger <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      <ul className="recent">
        {rows.map((tx) => (
          <li key={tx._id}>
            <span className="recent__date num">{formatDay(tx.date)}</span>
            <span className="recent__desc" title={tx.description}>
              {tx.description}
              <span className="recent__meta">
                {tx.category ? (tx.category.parent ? `${tx.category.parent.name} › ${tx.category.name}` : tx.category.name) : 'Not sorted'} · {formatAccount(tx.account)}
              </span>
            </span>
            <span className={`recent__amount num ${tx.type === 'debit' ? 'amount-debit' : 'amount-credit'}`}>
              {tx.type === 'debit' ? '−' : '+'}
              {formatMoney(tx.amount)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── EMIs and bills due soon ─────────────────────────────────────────── */
export function ComingUp() {
  const { data } = useCommitments();
  return <ComingUpView data={data} />;
}

export function ComingUpView({ data }) {
  if (!data?.items.length) return <section className="dash-section"><h2>Coming up</h2><p className="insight-muted">No bills or EMIs yet.</p></section>;
  const rows = data.items
    .filter((i) => i.active && (i.status === 'missed' || (i.next && !i.next.paid && i.next.daysUntil <= 14)))
    .sort((a, b) => (a.status === 'missed' ? -1 : b.status === 'missed' ? 1 : a.next.daysUntil - b.next.daysUntil));

  return (
    <section className="dash-section" aria-labelledby="coming-title">
      <div className="dash-section__head">
        <h2 id="coming-title">Coming up</h2>
        <Link to="/app/payments" className="dash-link">
          EMIs &amp; bills <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="insight-muted">Nothing due in the next two weeks. {formatMoney(Math.round(data.totals.monthly), { rounded: true })} goes out every month in EMIs and bills.</p>
      ) : (
        <ul className="recent">
          {rows.map((i) => (
            <li key={i._id}>
              <span className={`recent__date num${i.status === 'missed' ? ' amount-debit' : ''}`}>
                {i.status === 'missed' ? 'Missed' : i.next.daysUntil === 0 ? 'Today' : formatDay(i.next.date)}
              </span>
              <span className="recent__desc">
                {i.name}
                <span className="recent__meta">
                  {i.status === 'missed' ? `No payment found for ${formatDay(i.last.date)}` : i.next.daysUntil <= i.remindDays ? 'Due soon' : `In ${i.next.daysUntil} days`}
                  {i.loan?.outstanding != null && ` · ${formatMoney(Math.round(i.loan.outstanding), { rounded: true })} left on the loan`}
                </span>
              </span>
              <span className="recent__amount num">{i.amount ? formatMoney(i.amount) : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Welcome() {
  return (
    <section className="dash-welcome">
      <GrowingAcorns size={200} />
      <div>
        <h2>Nothing here yet</h2>
        <p>Import a bank statement and this page fills with your balances, what came in and went out, and where it went.</p>
        <div className="dash-welcome__actions">
          <Link to="/app/imports" className="btn btn--accent">
            Import a statement
          </Link>
          <Link to="/app/ledger" className="btn btn--quiet">
            Add a row by hand
          </Link>
        </div>
      </div>
    </section>
  );
}

