import { makeItem } from './layout';
import { WIDGET_BY_ID } from './registry';

// Templates save as ordinary widget instances, so every part remains editable afterwards.
export const DASHBOARD_TEMPLATES = [
  {
    id: 'everyday', name: 'Everyday', label: 'A little of everything',
    description: 'A quick money check, today’s tasks, and your habits in one balanced board.',
    detail: '7-day spending · 6-month cash flow',
    items: [
      { widget: 'ledger.spend', size: 's', settings: { days: '7' } },
      { widget: 'payments.monthly', size: 's' },
      { widget: 'tasks.hunterCard', size: 's' },
      { widget: 'tasks.streaks', size: 's', settings: { count: 4 } },
      { widget: 'tasks.today', size: 'm', settings: { count: 5 } },
      { widget: 'tasks.dailyQuest', size: 'm' },
      { widget: 'finance.cashflow', size: 'm', settings: { period: '6m', account: 'all' } },
      { widget: 'finance.comingUp', size: 'm' },
    ],
  },
  {
    id: 'money', name: 'Money check-in', label: 'Your finances',
    description: 'Balances, this month’s spending, recent transactions, and upcoming bills.',
    detail: 'Latest month · All accounts',
    items: [
      { widget: 'finance.overview', size: 'full' },
      { widget: 'finance.monthStats', size: 'full' },
      { widget: 'finance.breakdown', size: 'm', settings: { period: 'latest', account: 'all', metric: 'expense' } },
      { widget: 'finance.cashflow', size: 'm', settings: { period: '6m', account: 'all' } },
      { widget: 'finance.comingUp', size: 'm' },
      { widget: 'finance.recent', size: 'm', settings: { count: 6 } },
      { widget: 'finance.attention', size: 'full' },
    ],
  },
  {
    id: 'focus', name: 'Focus & habits', label: 'Make room for progress',
    description: 'Put today’s quests and habits first, with your XP and progress close by.',
    detail: '8 tasks · 6 habits · Daily Quest',
    items: [
      { widget: 'tasks.hunterCard', size: 's' },
      { widget: 'tasks.activity', size: 'l' },
      { widget: 'tasks.today', size: 'm', settings: { count: 8 } },
      { widget: 'tasks.dailyQuest', size: 'm' },
      { widget: 'tasks.streaks', size: 'm', settings: { count: 6 } },
      { widget: 'tasks.awards', size: 'm' },
    ],
  },
  {
    id: 'big-picture', name: 'Big picture', label: 'A longer view',
    description: 'Follow your balances, investing, and savings goals over a longer stretch.',
    detail: '12 months · All accounts · Up to 3 goals',
    items: [
      { widget: 'finance.overview', size: 'full' },
      { widget: 'finance.balance', size: 'full', settings: { period: '12m' } },
      { widget: 'finance.cashflow', size: 'm', settings: { period: '12m', account: 'all' } },
      { widget: 'finance.trend', size: 'm', settings: { period: '12m', account: 'all', metric: 'investment' } },
      { widget: 'goals.progress', size: 'm', settings: { goalId: 'all', count: 3 } },
      { widget: 'finance.breakdown', size: 'm', settings: { period: '12m', account: 'all', metric: 'expense' } },
    ],
  },
];

export function makeTemplateItems(template) {
  return template.items.map(({ widget, size, settings }) => {
    const def = WIDGET_BY_ID.get(widget);
    const defaults = Object.fromEntries(def.settings.map((s) => [s.key, s.default]));
    return makeItem(widget, size, { ...defaults, ...settings });
  });
}
