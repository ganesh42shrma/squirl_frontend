import { monthRange, shiftMonth } from '../../lib/format.js';

export const WIDGETS = [
  { id: 'overview', title: 'Balances', width: 'full' },
  { id: 'attention', title: 'Needs attention', width: 'full' },
  { id: 'balance', title: 'Balance history', width: 'full', period: true },
  { id: 'monthStats', title: 'Latest month', width: 'full' },
  { id: 'breakdown', title: 'Category donut', period: true, account: true, metric: true },
  { id: 'cashflow', title: 'Income vs spending', period: true, account: true },
  { id: 'trend', title: 'Monthly trend', period: true, account: true, metric: true },
  { id: 'accountSplit', title: 'Account split' },
  { id: 'whereItWent', title: 'Top spending categories' },
  { id: 'comingUp', title: 'Upcoming payments' },
  { id: 'recent', title: 'Recent transactions' },
];
export const PERIODS = { latest: 'Latest month', '3m': '3 months', '6m': '6 months', '12m': '12 months', all: 'All time' };
export const METRICS = { expense: 'Spending', income: 'Income', investment: 'Investments' };
export const defaults = () => ({ version: 1, widgets: WIDGETS.map((w) => ({ id: w.id, enabled: true, width: w.width || 'half', period: w.id === 'breakdown' ? 'latest' : '6m', account: 'all', metric: 'expense' })) });
export function getConfig(saved) {
  const base = defaults();
  if (!saved?.widgets) return base;
  // Preserve saved order. Newly introduced widgets stay off until explicitly chosen.
  const known = new Map(base.widgets.map((w) => [w.id, w]));
  const widgets = saved.widgets.filter((w) => known.has(w.id)).map((w) => ({ ...known.get(w.id), ...w }));
  return { version: 1, widgets: [...widgets, ...base.widgets.filter((w) => !widgets.some((x) => x.id === w.id)).map((w) => ({ ...w, enabled: false }))] };
}
export function widgetRange(widget, anchor) {
  const count = { latest: 1, '3m': 3, '6m': 6, '12m': 12 }[widget.period];
  return { ...(count ? { from: monthRange(shiftMonth(anchor, 1 - count)).from, to: monthRange(anchor).to } : {}), ...(widget.account !== 'all' ? { account: widget.account } : {}) };
}

export function categorySlices(groups, metric) {
  const sorted = (groups || []).filter((g) => g.categoryType === metric || (metric === 'expense' && g.key === null))
    .map((g) => ({ name: g.key === null ? 'Uncategorized' : g.label, value: Math.max(0, metric === 'income' ? g.credit - g.debit : g.debit - g.credit) }))
    .filter((g) => g.value > 0).sort((a, b) => b.value - a.value);
  return sorted.length <= 6 ? sorted : [...sorted.slice(0, 5), { name: 'Remaining categories', value: sorted.slice(5).reduce((n, g) => n + g.value, 0) }];
}

