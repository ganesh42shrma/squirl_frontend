import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatMoney, shortMoney } from '../../lib/format';
import './charts.css';

const money = (n) => formatMoney(Math.round(n), { rounded: true });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const tickLabel = (date, spanDays) => {
  const [y, m, d] = date.split('-');
  if (spanDays <= 120) return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
  return spanDays > 400 ? `${MONTHS[Number(m) - 1]} ’${y.slice(2)}` : MONTHS[Number(m) - 1];
};

// Over two months, tick once per month (on its first point), thinning to every 2nd/3rd month on long spans.
function monthTicks(points, spanDays) {
  if (spanDays <= 62) return undefined; // short ranges: let the axis pick day ticks
  const step = spanDays > 1100 ? 6 : spanDays > 550 ? 3 : spanDays > 400 ? 2 : 1;
  const ticks = [];
  let lastMonth = null;
  for (const p of points) {
    const month = p.date.slice(0, 7);
    if (month !== lastMonth) {
      const due = Number(month.slice(5, 7)) % step === 0 || step === 1;
      // A range starting late in a month would put two ticks almost on top of each other.
      const prev = ticks[ticks.length - 1];
      const roomy = !prev || (Date.parse(p.date) - Date.parse(prev)) / 86400000 >= 20 * step;
      if (due && roomy) ticks.push(p.date);
      else if (due && ticks.length === 1) ticks[0] = p.date; // keep the fuller month, drop the sliver
      lastMonth = month;
    }
  }
  return ticks;
}

function BalanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{formatDate(point.date)}</p>
      <p className="chart-tooltip__row">
        <span className="figure__marker" style={{ background: 'var(--viz-balance)' }} aria-hidden="true" />
        Balance
        <strong className="num">{money(point.balance)}</strong>
      </p>
    </div>
  );
}

/**
 * Day-end balance over time as a single-series area. The points are real day-ends from the
 * statements (not interpolated), drawn as steps: the balance holds until the next transaction.
 * `label` names the chart for screen readers; `showTable` adds a "Show as table" toggle.
 */
export function BalanceChart({ points, height = 260, label = 'Balance over time', showTable = true, loading = false }) {
  const [asTable, setAsTable] = useState(false);
  const spanDays = points.length > 1 ? (Date.parse(points[points.length - 1].date) - Date.parse(points[0].date)) / 86400000 : 0;
  // Balances rarely sit near zero, so zoom to their range, on round tick values (₹1L, ₹2L…),
  // and never below zero unless the balance itself goes negative.
  const { domain, yTicks } = useMemo(() => {
    if (!points.length) return { domain: [0, 1], yTicks: undefined };
    const values = points.map((p) => p.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const raw = (max - min || Math.abs(max) || 1) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
    let lo = Math.floor(min / step) * step;
    if (min >= 0 && lo < 0) lo = 0;
    const hi = Math.ceil(max / step) * step + (max % step === 0 ? step : 0);
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
    return { domain: [lo, hi], yTicks: ticks };
  }, [points]);

  if (!points.length) return <p className="insight-muted">No balance history in this range.</p>;

  const last = points[points.length - 1];
  const ticks = monthTicks(points, spanDays);

  return (
    <div className="balance-chart">
      {showTable && (
        <div className="chart-head chart-head--end">
          <button type="button" className="link-button" onClick={() => setAsTable((v) => !v)}>
            {asTable ? 'Show as chart' : 'Show as table'}
          </button>
        </div>
      )}
      {asTable ? (
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Balance at day end</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date}>
                  <th scope="row">{formatDate(p.date)}</th>
                  <td className="num">{money(p.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className={`chart${loading ? ' is-loading' : ''}`}
          role="img"
          aria-label={`${label}: ${money(last.balance)} on ${formatDate(last.date)}. Use Show as table for every value.`}
        >
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--viz-balance)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--viz-balance)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => tickLabel(d, spanDays)}
                ticks={ticks}
                interval={ticks ? 0 : 'preserveStartEnd'}
                minTickGap={ticks ? 0 : 36}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
                tick={{ fill: 'var(--ink-soft)', fontSize: 12 }}
              />
              <YAxis
                domain={domain}
                ticks={yTicks}
                tickFormatter={shortMoney}
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fill: 'var(--ink-faint)', fontSize: 12 }}
              />
              <Tooltip content={<BalanceTooltip />} cursor={{ stroke: 'var(--ink-faint)', strokeWidth: 1 }} />
              <Area
                type="stepAfter"
                dataKey="balance"
                stroke="var(--viz-balance)"
                strokeWidth={2}
                fill="url(#balance-fill)"
                activeDot={{ r: 5, stroke: 'var(--paper)', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** A tiny trend line for an account tile: no axes, decoration beside a value that's already printed. */
export function Sparkline({ points, width = 120, height = 36 }) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const t0 = Date.parse(points[0].date);
  const span = Date.parse(points[points.length - 1].date) - t0 || 1;
  const x = (p) => ((Date.parse(p.date) - t0) / span) * (width - 4) + 2;
  const y = (v) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  // Step path, like the full chart.
  let d = `M${x(points[0]).toFixed(1)},${y(values[0]).toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) d += `H${x(points[i]).toFixed(1)}V${y(values[i]).toFixed(1)}`;
  const end = points[points.length - 1];
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="var(--viz-balance)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x(end)} cy={y(end.balance)} r="3" fill="var(--viz-balance)" stroke="var(--paper)" strokeWidth="1.5" />
    </svg>
  );
}
