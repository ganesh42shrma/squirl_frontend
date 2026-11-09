import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, AreaChart, Area } from 'recharts';
import { useHistory } from '../insights/useInsights';
import { useSummary } from '../ledger/useTransactions';
import { formatMoney, shortMoney, formatMonthShort, formatAccount } from '../../lib/format';
import { METRICS, PERIODS, widgetRange, categorySlices } from './dashboardConfig';

const COLORS = ['var(--clay)', 'var(--viz-income)', 'var(--viz-investment)', 'var(--viz-balance)', '#a897bd', '#c5aa6b'];
const money = (v) => formatMoney(Math.round(v), { rounded: true });
const tip = { background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: 10 };

export function ChartWidgetView({ widget, months = [], slices = [], preview = false, loading = false, error = false }) {
  const donut = ['breakdown', 'accountSplit'].includes(widget.id);
  const title = widget.id === 'breakdown' ? `${METRICS[widget.metric]} by category` : widget.id === 'cashflow' ? 'Income vs spending' : widget.id === 'trend' ? `${METRICS[widget.metric]} trend` : 'Account balances';
  const metricKey = { expense: 'spent', income: 'earned', investment: 'invested' }[widget.metric];
  const years = new Set(months.map((m) => m.month.slice(0, 4)));
  const data = months.map((m) => ({ ...m, label: `${formatMonthShort(m.month)}${years.size > 1 ? ` ’${m.month.slice(2, 4)}` : ''}` }));
  const total = slices.reduce((n, d) => n + d.value, 0);
  const caption = widget.id === 'accountSplit' ? 'Positive balances · latest statements' : `${PERIODS[widget.period]} · ${widget.account === 'all' ? 'All accounts' : formatAccount(widget.account)}`;
  return <section className="dash-section chart-widget">
    <div className="dash-section__head"><h2>{title}</h2></div>
    <p className="member-hint">{caption}</p>
    {loading ? <p className="insight-muted">Loading chart…</p> : error ? <p className="import-error">Couldn’t load chart.</p> : (donut ? !total : !data.length) ? <p className="insight-muted">No data for this selection.</p> : <>
      <div className="widget-chart" role="img" aria-label={title}>
        <ResponsiveContainer width="100%" height={240}>
          {donut ? <PieChart><Pie data={slices} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} stroke="none" isAnimationActive={!preview}>
            {slices.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
          </Pie><Tooltip formatter={money} contentStyle={tip} /></PieChart>
          : widget.id === 'cashflow' ? <BarChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} /><YAxis tickFormatter={shortMoney} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} width={58} />
            <Tooltip formatter={money} contentStyle={tip} /><Legend />
            <Bar dataKey="earned" name="Income" fill="var(--viz-income)" radius={[4, 4, 0, 0]} isAnimationActive={!preview} />
            <Bar dataKey="spent" name="Spending" fill="var(--clay)" radius={[4, 4, 0, 0]} isAnimationActive={!preview} />
          </BarChart> : <AreaChart data={data} margin={{ left: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} /><YAxis tickFormatter={shortMoney} tick={{ fill: 'var(--ink-soft)', fontSize: 11 }} width={58} />
            <Tooltip formatter={money} contentStyle={tip} /><Area type="monotone" dataKey={metricKey} name={METRICS[widget.metric]} stroke="var(--clay)" fill="var(--clay)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={!preview} />
          </AreaChart>}
        </ResponsiveContainer>
      </div>
      {donut && <><strong className="widget-total">{money(total)}</strong><ul className="widget-legend">{slices.map((d, i) => <li key={d.name}><span className="widget-dot" style={{ background: COLORS[i % COLORS.length] }} /><span>{d.name}</span><strong>{money(d.value)}</strong></li>)}</ul></>}
      {!donut && <details className="widget-table"><summary>View data</summary><table className="data-table"><thead><tr><th>Month</th>{widget.id === 'cashflow' ? <><th>Income</th><th>Spending</th></> : <th>{METRICS[widget.metric]}</th>}</tr></thead><tbody>{data.map((m) => <tr key={m.month}><td>{m.label}</td>{widget.id === 'cashflow' ? <><td>{money(m.earned)}</td><td>{money(m.spent)}</td></> : <td>{money(m[metricKey])}</td>}</tr>)}</tbody></table></details>}
    </>}
  </section>;
}

export function LiveChartWidget({ widget, anchor, accounts }) {
  if (widget.id === 'accountSplit') return <ChartWidgetView widget={widget} slices={accounts.filter((a) => a.balance > 0).map((a) => ({ name: formatAccount(a.account), value: a.balance }))} />;
  return widget.id === 'breakdown' ? <CategoryWidget widget={widget} anchor={anchor} /> : <HistoryWidget widget={widget} anchor={anchor} />;
}
function CategoryWidget({ widget, anchor }) {
  const query = useSummary({ ...widgetRange(widget, anchor), groupBy: 'topCategory' });
  return <ChartWidgetView widget={widget} slices={categorySlices(query.data?.groups, widget.metric)} loading={query.isLoading} error={query.isError} />;
}
function HistoryWidget({ widget, anchor }) {
  const query = useHistory(widgetRange(widget, anchor));
  return <ChartWidgetView widget={widget} months={query.data?.months} loading={query.isLoading} error={query.isError} />;
}
