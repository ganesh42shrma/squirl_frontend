import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Question, Sparkle } from '@phosphor-icons/react';
import { BalanceChart } from '../../components/charts/BalanceChart';
import { Button } from '../../components/ui/Button';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { describeError } from '../../api/client';
import { formatAccount, formatDate, formatMoney, formatMonth, formatMonthShort, shortMoney, todayISO } from '../../lib/format';
import { MONEY_TYPES } from '../../lib/moneyTypes';
import { useBalances, useHistory, useLlmStatus, useWriteSummary } from './useInsights';

const money = (n) => formatMoney(Math.round(n), { rounded: true });

// Range choices: rolling 12 months, everything, and each calendar year that has data.
function rangeOptions(first, last) {
  if (!first) return [];
  const end = new Date(`${last}T00:00:00Z`);
  const start12 = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1)).toISOString().slice(0, 10);
  const options = [
    { id: '12m', label: 'Last 12 months', from: start12 > first ? start12 : first, to: last },
    { id: 'all', label: 'All time', from: first, to: last },
  ];
  for (let y = Number(last.slice(0, 4)); y >= Number(first.slice(0, 4)); y -= 1) {
    options.push({ id: String(y), label: String(y), from: `${y}-01-01`, to: `${y}-12-31` });
  }
  return options;
}

/* ── Written summary from the local model ────────────────────────────── */
function Story({ range }) {
  const status = useLlmStatus();
  const write = useWriteSummary();
  const result = write.data && write.data.from === range.from && write.data.to === range.to ? write.data : null;

  return (
    <section className="story" aria-labelledby="story-title">
      <h2 id="story-title" className="story__title">
        <Sparkle size={18} weight="duotone" aria-hidden="true" /> Your financial overview
      </h2>
      {result ? (
        <>
          <p className="story__text">{result.text}</p>
          {result.check && !result.check.ok && (
            <p className="story__warning" role="note">
              These numbers aren’t in Squirl’s figures, so treat them as wrong: {result.check.unverified.join(', ')}. The figures below are exact.
            </p>
          )}
          <p className="story__meta">
            Local analysis · {result.model}{result.check?.ok ? ' · Amount check passed' : ''}
          </p>
          <div>
            <Button variant="quiet" size="small" onClick={() => write.mutate({ from: range.from, to: range.to })} disabled={write.isPending}>
              {write.isPending ? 'Analysing…' : 'Write it again'}
            </Button>
          </div>
        </>
      ) : status.data?.available ? (
        <>
          <p className="story__hint">
            An overview, key patterns and practical next steps from your recorded activity.
            {status.data.loaded === false && ' It’s still loading into memory (a few minutes after starting), so the first summary will wait for that.'}
          </p>
          <div>
            <Button variant="quiet" size="small" onClick={() => write.mutate({ from: range.from, to: range.to })} disabled={write.isPending}>
              {write.isPending ? 'Analysing…' : 'Write a summary'}
            </Button>
          </div>
        </>
      ) : (
        <p className="story__hint">
          {status.isLoading
            ? 'Checking for a local model…'
            : 'Start a local model (see the backend README, “Local model”) and this space will offer a written summary of the period. The figures below don’t need it.'}
        </p>
      )}
      {write.isError && <p className="import-error">{describeError(write.error)}</p>}
    </section>
  );
}

/* ── Money in and out per month ──────────────────────────────────────── */
function MonthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{formatMonth(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="chart-tooltip__row">
          <span className="figure__marker" style={{ background: p.color }} aria-hidden="true" />
          {p.name}
          <strong className="num">{money(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function MonthlyFlow({ months, loading }) {
  const [asTable, setAsTable] = useState(false);
  const data = months.map((m) => ({ month: m.month, earned: Math.round(m.earned), spent: Math.round(m.spent) }));

  return (
    <>
      <div className="chart-head">
        <div className="chart-legend" aria-hidden={asTable}>
          <span>
            <span className="figure__marker" style={{ background: MONEY_TYPES.income.viz }} /> Earned
          </span>
          <span>
            <span className="figure__marker" style={{ background: MONEY_TYPES.expense.viz }} /> Spent
          </span>
        </div>
        <button type="button" className="link-button" onClick={() => setAsTable((v) => !v)}>
          {asTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? (
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Earned</th>
                <th scope="col">Spent</th>
                <th scope="col">Invested</th>
                <th scope="col">Left over</th>
                <th scope="col">Balance at month end</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{m.label}</th>
                  <td className="num">{money(m.earned)}</td>
                  <td className="num">{money(m.spent)}</td>
                  <td className="num">{money(m.invested)}</td>
                  <td className="num">{money(m.net)}</td>
                  <td className="num">{m.balance === null ? '—' : money(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`chart${loading ? ' is-loading' : ''}`} role="img" aria-label="Earned and spent for each month. Use Show as table for the numbers.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={2} barCategoryGap={months.length > 18 ? '18%' : '28%'} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => (months.length > 12 ? `${formatMonthShort(m)} ’${m.slice(2, 4)}` : formatMonthShort(m))}
                minTickGap={12}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
                tick={{ fill: 'var(--ink-soft)', fontSize: 12 }}
              />
              <YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} width={56} tick={{ fill: 'var(--ink-faint)', fontSize: 12 }} />
              <Tooltip content={<MonthTooltip />} cursor={{ fill: 'var(--stone)', opacity: 0.7 }} />
              <Bar dataKey="earned" name="Earned" fill={MONEY_TYPES.income.viz} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="spent" name="Spent" fill={MONEY_TYPES.expense.viz} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

// Plain bars: the ledger shows one month at a time, so a multi-month total has no single place to link to.
function TopCategories({ rows }) {
  if (!rows.length) return <p className="insight-muted">No spending in this period.</p>;
  const max = rows[0].amount;
  return (
    <ol className="spend-bars">
      {rows.map((row) => (
        <li key={row.key ?? 'none'}>
          <div className="spend-bar" title={`${row.count} transaction${row.count === 1 ? '' : 's'}`}>
            <span className="spend-bar__label">
              {row.key === null ? <Question size={18} weight="duotone" aria-hidden="true" /> : <CategoryIcon id={row.key} />}
              <span>{row.label}</span>
            </span>
            <span className="spend-bar__track" aria-hidden="true">
              <span className={`spend-bar__fill${row.key === null ? ' is-unsorted' : ''}`} style={{ width: `${Math.max(2, (row.amount / max) * 100)}%` }} />
            </span>
            <span className="spend-bar__value num">{money(row.amount)}</span>
            <span className="spend-bar__share num">{row.share}%</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Biggest({ rows }) {
  if (!rows.length) return null;
  return (
    <ul className="recent">
      {rows.map((tx) => (
        <li key={tx._id}>
          <span className="recent__date recent__date--full num">{formatDate(tx.date)}</span>
          <span className="recent__desc" title={tx.description}>
            {tx.description}
            <span className="recent__meta">
              {tx.category || 'Not sorted'} · {formatAccount(tx.account)}
            </span>
          </span>
          <span className={`recent__amount num ${tx.type === 'debit' ? 'amount-debit' : 'amount-credit'}`}>
            {tx.type === 'debit' ? '−' : '+'}
            {money(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function HistoryView() {
  const all = useHistory();
  const options = useMemo(() => rangeOptions(all.data?.from, all.data?.to), [all.data?.from, all.data?.to]);
  const [rangeId, setRangeId] = useState('12m');
  const range = options.find((o) => o.id === rangeId) || options[0];

  const history = useHistory(range ? { from: range.from, to: range.to > todayISO() ? todayISO() : range.to } : {});
  const balances = useBalances(range ? { from: range.from, to: range.to } : {});
  const h = history.data;

  if (all.isLoading) return <div className="insight-skeleton" />;
  if (all.isError) return <p className="import-error">{all.error.message}</p>;
  if (!all.data?.from) {
    return (
      <div className="insight-empty">
        <EmptyJar size={88} />
        <p>
          No history yet. <Link to="/app/imports">Import a statement</Link>, a year’s worth works best.
        </p>
      </div>
    );
  }

  return (
    <div className="history">
      <div className="chip-group history__ranges" role="group" aria-label="Period">
        {options.map((o) => (
          <button key={o.id} type="button" className={`chip${o.id === range.id ? ' is-active' : ''}`} aria-pressed={o.id === range.id} onClick={() => setRangeId(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {h && (
        <>
          <p className="history__period">
            {formatDate(h.from)} to {formatDate(h.to)}
          </p>

          <Story range={{ from: h.from, to: h.to }} />

          {h.highlights.length > 0 && (
            <ul className="highlights" aria-label="Highlights">
              {h.highlights.map((item) => (
                <li key={item.id} className="highlight">
                  <p className="highlight__title">{item.title}</p>
                  <p className="highlight__value">{item.value}</p>
                  <p className="highlight__detail">{item.detail}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="insights__grid">
            <section className="insight insight--wide history__full" aria-labelledby="flow-title">
              <h2 id="flow-title">Money in and out, month by month</h2>
              <MonthlyFlow months={h.months} loading={history.isFetching} />
            </section>

            <section className="insight insight--wide history__full" aria-labelledby="hbalance-title">
              <h2 id="hbalance-title">Balance over time</h2>
              {balances.data?.accounts?.length > 1 && (
                <p className="insight-muted">All accounts combined, from when every account has statement data.</p>
              )}
              <BalanceChart points={balances.data?.combined || []} label="Combined balance over the period" loading={balances.isFetching} />
            </section>

            <section className="insight insight--wide" aria-labelledby="hwhere-title">
              <h2 id="hwhere-title">Where it went</h2>
              <TopCategories rows={h.topCategories} />
            </section>

            <section className="insight" aria-labelledby="hbig-title">
              <h2 id="hbig-title">Largest rows</h2>
              <Biggest rows={h.biggest} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
