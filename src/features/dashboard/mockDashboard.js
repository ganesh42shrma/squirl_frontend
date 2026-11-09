import { shiftMonth } from '../../lib/format.js';
import { widgetRange } from './dashboardConfig.js';

export const MOCK_MONTH = '2026-10';
const points = Array.from({ length: 24 }, (_, i) => ({ date: `${shiftMonth(MOCK_MONTH, i - 23)}-28`, balance: 65000 + i * 4300 + Math.sin(i) * 15000 }));
const adjustment = 178500 - points.at(-1).balance;
points.forEach((p) => { p.balance = Math.round(p.balance + adjustment); });
const accounts = [{ account: 'sbi', balance: 112000, asOf: '2026-10-28', gaps: [], points: points.map((p) => ({ ...p, balance: Math.round(p.balance * 112000 / 178500) })) }, { account: 'kotak', balance: 66500, asOf: '2026-10-28', gaps: [], points: points.map((p) => ({ ...p, balance: Math.round(p.balance * 66500 / 178500) })) }];
export const MOCK_DATA = {
  accounts, total: { balance: 178500, asOf: '2026-10-28', since: points[0].date, change30: 14500 },
  combined: points, month: MOCK_MONTH, unsorted: 0,
  rows: ['Groceries', 'Salary', 'Coffee', 'Internet', 'Train tickets', 'Bookshop'].map((name, i) => ({ _id: `mock-${i}`, date: `2026-10-${28 - i}`, description: name, category: { name: i === 1 ? 'Salary' : 'Shopping' }, account: i % 2 ? 'sbi' : 'kotak', type: i === 1 ? 'credit' : 'debit', amount: [2800, 95000, 240, 999, 1800, 650][i] })),
  summary: { groups: [{ key: 'expense', debit: 38200, credit: 1200 }, { key: 'income', debit: 0, credit: 95000 }, { key: 'investment', debit: 12000, credit: 0 }] },
  previous: { groups: [{ key: 'expense', debit: 42000, credit: 0 }, { key: 'income', debit: 0, credit: 90000 }, { key: 'investment', debit: 10000, credit: 0 }] },
  categories: { groups: ['Food & Drinks', 'Housing', 'Shopping', 'Transport', 'Subscriptions'].map((label, i) => ({ key: `mock-cat-${i}`, label, categoryType: 'expense', debit: [12000, 16000, 4400, 3000, 1600][i], credit: 0, count: i + 3 })) },
  commitments: { totals: { monthly: 15600 }, items: [{ _id: 'mock-bill', active: true, name: 'Car EMI', status: 'active', next: { date: '2026-11-12', daysUntil: 3, paid: false }, amount: 14600, remindDays: 3 }, { _id: 'mock-sub', active: true, name: 'Music subscription', status: 'active', next: { date: '2026-11-15', daysUntil: 6, paid: false }, amount: 199, remindDays: 3 }] },
};

export function mockChartData(widget) {
  const range = widgetRange(widget, MOCK_MONTH);
  const n = { latest: 1, '3m': 3, '6m': 6, '12m': 12, all: 24 }[widget.period];
  const factor = widget.account === 'all' ? 1 : widget.account === 'sbi' ? 0.7 : 0.3;
  const months = Array.from({ length: n }, (_, i) => {
    const offset = i - n + 1;
    return { month: shiftMonth(MOCK_MONTH, offset), earned: Math.round((95000 + offset * 1100) * factor), spent: Math.round((37000 + Math.sin(offset) * 8500 + offset * 300) * factor), invested: Math.round((12000 + offset * 200) * factor) };
  });
  const labels = widget.metric === 'income' ? ['Salary', 'Freelancing', 'Interest'] : widget.metric === 'investment' ? ['Mutual funds', 'Stocks', 'Deposits'] : ['Housing', 'Food & Drinks', 'Shopping', 'Transport', 'Subscriptions'];
  const total = months.reduce((sum, m) => sum + m[{ expense: 'spent', income: 'earned', investment: 'invested' }[widget.metric]], 0);
  const weights = widget.metric === 'expense' ? [16000 / 37000, 12000 / 37000, 4400 / 37000, 3000 / 37000, 1600 / 37000] : [0.8, 0.15, 0.05];
  const slices = widget.id === 'accountSplit' ? accounts.map((a) => ({ name: a.account.toUpperCase(), value: a.balance })) : labels.map((name, i) => ({ name, value: Math.round(total * weights[i]) }));
  return { months, slices, range };
}
