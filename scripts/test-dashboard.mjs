import assert from 'node:assert/strict';
import { defaults, getConfig, widgetRange, categorySlices } from '../src/features/dashboard/dashboardConfig.js';
import { MOCK_DATA, mockChartData } from '../src/features/dashboard/mockDashboard.js';

const base = defaults();
assert.equal(base.widgets.length, 11);
assert.equal(new Set(base.widgets.map((w) => w.id)).size, 11);
assert.deepEqual(getConfig(null), base);
const saved = { version: 1, widgets: [base.widgets[5], { ...base.widgets[0], enabled: false }] };
const restored = getConfig(saved);
assert.deepEqual(restored.widgets.slice(0, 2), saved.widgets);
assert.ok(restored.widgets.slice(2).every((w) => !w.enabled));
assert.deepEqual(widgetRange({ period: '3m', account: 'sbi' }, '2026-01'), { from: '2025-11-01', to: '2026-01-31', account: 'sbi' });
assert.deepEqual(widgetRange({ period: 'latest', account: 'all' }, '2024-02'), { from: '2024-02-01', to: '2024-02-29' });
assert.deepEqual(widgetRange({ period: 'all', account: 'all' }, '2026-10'), {});
const groups = [
  { key: 'food', label: 'Food', categoryType: 'expense', debit: 100, credit: 20 },
  { key: 'salary', label: 'Salary', categoryType: 'income', debit: 0, credit: 1000 },
  { key: 'investment', label: 'Funds', categoryType: 'investment', debit: 200, credit: 0 },
  { key: null, debit: 10, credit: 0 },
];
assert.equal(categorySlices(groups, 'expense').reduce((n, d) => n + d.value, 0), 90);
assert.deepEqual(categorySlices(groups, 'income'), [{ name: 'Salary', value: 1000 }]);
assert.deepEqual(categorySlices(groups, 'investment'), [{ name: 'Funds', value: 200 }]);
const long = Array.from({ length: 10 }, (_, i) => ({ key: String(i), label: String(i), categoryType: 'expense', debit: i + 1, credit: 0 }));
assert.equal(categorySlices(long, 'expense').length, 6);
assert.equal(categorySlices(long, 'expense').reduce((n, d) => n + d.value, 0), 55);
assert.equal(MOCK_DATA.total.balance, MOCK_DATA.accounts.reduce((n, a) => n + a.balance, 0));
assert.equal(MOCK_DATA.combined.at(-1).balance, MOCK_DATA.total.balance);
for (const period of ['latest', '3m', '6m', '12m', 'all']) {
  const sample = mockChartData({ id: 'breakdown', account: 'all', period, metric: 'expense' });
  const total = sample.months.reduce((n, m) => n + m.spent, 0);
  assert.ok(Math.abs(total - sample.slices.reduce((n, d) => n + d.value, 0)) <= sample.slices.length);
  assert.equal(sample.months.at(-1).spent, 37000);
}
assert.equal(mockChartData({ id: 'trend', account: 'sbi', period: 'latest', metric: 'expense' }).months[0].spent, 25900);
console.log('Passed: widget defaults/order/visibility, saved layout compatibility, cross-year/leap-year periods, account ranges, chart metrics/refunds, category totals and consistent mock data.');
