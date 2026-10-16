import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Question } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { api } from '../../api/client';
import { MonthSwitcher } from '../../components/ui/MonthSwitcher';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { TagPill } from '../tags/TagPill';
import { useSummary } from '../ledger/useTransactions';
import { useMonthParam } from '../../lib/hooks';
import { formatMoney, formatMonth, formatMonthName, formatMonthShort, monthRange, shiftMonth } from '../../lib/format';
import { MONEY_TYPES, monthFigures } from '../../lib/moneyTypes';
import '../../components/layout/layout.css';
import './insights.css';

const money = (n) => formatMoney(Math.round(n), { rounded: true });

// Compact axis ticks: ₹12k, ₹1.2L (lakh), the way amounts are said out loud in India.
const shortMoney = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
};

/* ── Where it went: expenses by top-level category ───────────────────── */
function WhereItWent({ month, range }) {
  const { data, isLoading } = useSummary({ ...range, groupBy: 'topCategory' });

  const rows = useMemo(() => {
    const groups = (data?.groups || []).filter((g) => g.categoryType === 'expense' || g.key === null);
    return groups
      .map((g) => ({ ...g, value: g.key === null ? g.debit : g.debit - g.credit }))
      .filter((g) => g.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const max = rows[0]?.value || 1;

  if (isLoading) return <div className="insight-skeleton" />;
  if (!rows.length) {
    return (
      <div className="insight-empty">
        <EmptyJar size={88} />
        <p>No spending logged for {formatMonth(month)}.</p>
      </div>
    );
  }

  return (
    <>
      <p className="insight-headline">
        {rows[0].key === null
          ? `Most of ${formatMonthName(month)}’s spending isn’t sorted into a category yet.`
          : `${rows[0].label} took the biggest share of ${formatMonthName(month)}’s spending.`}
      </p>
      <ol className="spend-bars">
        {rows.map((row) => {
          const share = Math.round((row.value / total) * 100);
          const to = `/app?month=${month}&category=${row.key === null ? 'none' : row.key}`;
          return (
            <li key={row.key ?? 'none'}>
              <Link
                to={to}
                className="spend-bar"
                title={`${row.count} transaction${row.count === 1 ? '' : 's'}. Open them in the ledger`}
              >
                <span className="spend-bar__label">
                  {row.key === null ? <Question size={18} weight="duotone" aria-hidden="true" /> : <CategoryIcon id={row.key} />}
                  <span>{row.key === null ? 'Not sorted yet' : row.label}</span>
                </span>
                <span className="spend-bar__track" aria-hidden="true">
                  <span
                    className={`spend-bar__fill${row.key === null ? ' is-unsorted' : ''}`}
                    style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                  />
                </span>
                <span className="spend-bar__value num">{money(row.value)}</span>
                <span className="spend-bar__share num">{share}%</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/* ── The month's figures ─────────────────────────────────────────────── */
function MonthFigures({ range }) {
  const { data } = useSummary({ ...range, groupBy: 'categoryType' });
  const f = monthFigures(data?.groups);

  const items = [
    { type: 'expense', label: 'Spent', value: f.spent },
    { type: 'income', label: 'Earned', value: f.earned },
    { type: 'investment', label: 'Invested', value: f.invested },
    { type: 'transfer', label: 'Moved between your accounts', value: f.moved },
    { type: 'lending', label: 'Lent to people', value: f.lentOut, note: f.lentBack ? `${money(f.lentBack)} came back` : null },
  ];

  return (
    <dl className="figures">
      {items.map((item) => (
        <div key={item.type} className="figure">
          <dt>
            <span className="figure__marker" style={{ background: MONEY_TYPES[item.type].viz }} aria-hidden="true" />
            {item.label}
          </dt>
          <dd className="num">
            {money(item.value)}
            {item.note && <span className="figure__note">{item.note}</span>}
          </dd>
        </div>
      ))}
      {f.unsortedCount > 0 && (
        <p className="figures__unsorted">
          {f.unsortedCount} row{f.unsortedCount === 1 ? ' is' : 's are'} not sorted yet and counted as spending or
          earnings. <Link to="/app/sort-out">Sort them</Link>
        </p>
      )}
    </dl>
  );
}

/* ── Six months: spent vs earned ─────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{label}</p>
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

function SixMonths({ month }) {
  const [asTable, setAsTable] = useState(false);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));

  const results = useQueries({
    queries: months.map((m) => ({
      queryKey: ['summary', { ...monthRange(m), groupBy: 'categoryType' }],
      queryFn: () => api('/transactions/summary', { query: { ...monthRange(m), groupBy: 'categoryType' } }).then((r) => r.data),
    })),
  });

  const data = months.map((m, i) => {
    const f = monthFigures(results[i].data?.groups);
    return { month: m, label: formatMonthShort(m), spent: Math.round(f.spent), earned: Math.round(f.earned) };
  });
  const last = data.length - 1;
  const loading = results.some((r) => r.isLoading);

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
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Earned</th>
              <th scope="col">Spent</th>
              <th scope="col">Left over</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <th scope="row">{formatMonth(d.month)}</th>
                <td className="num">{money(d.earned)}</td>
                <td className="num">{money(d.spent)}</td>
                <td className="num">{money(d.earned - d.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={`chart${loading ? ' is-loading' : ''}`} role="img" aria-label="Earned and spent for each of the last six months. Use Show as table for the numbers.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--ink-soft)', fontSize: 13 }} />
              <YAxis tickFormatter={shortMoney} tickLine={false} axisLine={false} width={52} tick={{ fill: 'var(--ink-faint)', fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--stone)', opacity: 0.7 }} />
              <Bar dataKey="earned" name="Earned" fill={MONEY_TYPES.income.viz} radius={[4, 4, 0, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="earned"
                  position="top"
                  content={({ x, y, width, value, index }) =>
                    index === last && value ? (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" className="chart-label">
                        {shortMoney(value)}
                      </text>
                    ) : null
                  }
                />
              </Bar>
              <Bar dataKey="spent" name="Spent" fill={MONEY_TYPES.expense.viz} radius={[4, 4, 0, 0]} maxBarSize={22}>
                <LabelList
                  dataKey="spent"
                  position="top"
                  content={({ x, y, width, value, index }) =>
                    index === last && value ? (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" className="chart-label">
                        {shortMoney(value)}
                      </text>
                    ) : null
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

/* ── Tags: where tagged spending went ────────────────────────────────── */
function TopTags({ range }) {
  const { data } = useSummary({ ...range, groupBy: 'tag', type: 'debit' });
  const rows = (data?.groups || []).slice(0, 8);

  if (!rows.length) return <p className="insight-muted">No tagged spending this month.</p>;

  return (
    <ul className="tag-totals">
      {rows.map((row) => (
        <li key={row.key}>
          <TagPill name={row.key} />
          <span className="num">{money(row.debit)}</span>
        </li>
      ))}
    </ul>
  );
}

export function InsightsPage() {
  const [month, setMonth] = useMonthParam();
  const range = monthRange(month);

  return (
    <div className="insights">
      <header className="ledger__head">
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <div className="insights__grid">
        <section className="insight insight--wide" aria-labelledby="where-title">
          <h2 id="where-title">Where it went</h2>
          <WhereItWent month={month} range={range} />
        </section>

        <section className="insight" aria-labelledby="figures-title">
          <h2 id="figures-title">The month in figures</h2>
          <MonthFigures range={range} />
        </section>

        <section className="insight insight--wide" aria-labelledby="six-title">
          <h2 id="six-title">The last six months</h2>
          <SixMonths month={month} />
        </section>

        <section className="insight" aria-labelledby="tags-title">
          <h2 id="tags-title">Spending by tag</h2>
          <TopTags range={range} />
        </section>
      </div>
    </div>
  );
}
