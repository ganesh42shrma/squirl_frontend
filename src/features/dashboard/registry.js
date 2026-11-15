// The widget catalogue. A widget is a plain description: where it belongs, what it can be
// configured with, and lazy components for the board (`component`) and the picker (`preview`).
// The dashboard never knows widget ids in advance: the saved layout (users.dashboard_config) only
// stores ids and settings, and an id this registry doesn't know is skipped, so adding a widget is
// one entry here. Imports and Sort out are maintenance pages, not widgets, by design.
import { lazy } from 'react';
import { MODULES } from '../../app/modules';

const lazyExport = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const finance = () => import('./widgets/FinanceWidgets');
const money = () => import('./widgets/MoneyWidgets');
const live = () => import('./widgets/LiveWidgets');
const tasks = () => import('./widgets/TasksWidgets');

// Both components come from the same module and export name + 'Widget' / 'Preview'.
const parts = (load, name) => ({ component: lazyExport(load, `${name}Widget`), preview: lazyExport(load, `${name}Preview`) });

const PERIOD = { key: 'period', type: 'period', label: 'Period' };
const ACCOUNT = { key: 'account', type: 'account', label: 'Account', default: 'all' };
const METRIC = { key: 'metric', type: 'metric', label: 'Data', default: 'expense' };
const count = (label, def, min, max) => ({ key: 'count', type: 'number', label, default: def, min, max });

/**
 * module/tab: where it belongs (tab 'overview' = the cross-cutting headline widgets)
 * sizes: the sizes it looks right at; defaultSize: what "Add" picks
 * multi: allow more than one on the board (two goals, two currencies...)
 */
const define = (w) => ({ sizes: ['m', 'l'], defaultSize: 'm', settings: [], multi: false, ...w });

export const WIDGETS = [
  // ── Finance: overview ──
  define({ id: 'finance.overview', module: 'finance', tab: 'overview', title: 'Balances', description: 'Total across your accounts, with each account’s trend.', sizes: ['l', 'full'], defaultSize: 'full', ...parts(finance, 'Overview') }),
  define({ id: 'finance.attention', module: 'finance', tab: 'overview', title: 'Needs attention', description: 'Statement gaps, stale accounts and rows waiting for a category.', sizes: ['m', 'l', 'full'], defaultSize: 'full', ...parts(finance, 'Attention') }),
  define({ id: 'finance.balance', module: 'finance', tab: 'overview', title: 'Balance history', description: 'Combined balance over time.', sizes: ['l', 'full'], defaultSize: 'full', settings: [{ ...PERIOD, default: '6m' }], ...parts(finance, 'Balance') }),
  define({ id: 'finance.accountSplit', module: 'finance', tab: 'overview', title: 'Account split', description: 'How your balance is spread across accounts.', ...parts(finance, 'AccountSplit') }),
  // ── Finance: highlights ──
  define({ id: 'finance.monthStats', module: 'finance', tab: 'highlights', title: 'Latest month', description: 'Spent, earned, invested and left over, against the month before.', sizes: ['l', 'full'], defaultSize: 'full', ...parts(finance, 'MonthStats') }),
  define({ id: 'finance.breakdown', module: 'finance', tab: 'highlights', title: 'Category donut', description: 'Where money went (or came from) by category.', settings: [{ ...PERIOD, default: 'latest' }, ACCOUNT, METRIC], multi: true, ...parts(finance, 'Breakdown') }),
  define({ id: 'finance.cashflow', module: 'finance', tab: 'highlights', title: 'Income vs spending', description: 'Money in and out, month by month.', settings: [{ ...PERIOD, default: '6m' }, ACCOUNT], multi: true, ...parts(finance, 'Cashflow') }),
  define({ id: 'finance.trend', module: 'finance', tab: 'highlights', title: 'Monthly trend', description: 'One kind of money (spending, income or investing) over time.', settings: [{ ...PERIOD, default: '6m' }, ACCOUNT, METRIC], multi: true, ...parts(finance, 'Trend') }),
  define({ id: 'finance.whereItWent', module: 'finance', tab: 'highlights', title: 'Top spending categories', description: 'The biggest five categories this month.', ...parts(finance, 'WhereItWent') }),
  define({ id: 'highlights.insights', module: 'finance', tab: 'highlights', title: 'Highlights', description: 'A few notable facts from your last three months.', sizes: ['m', 'l', 'full'], settings: [count('How many', 3, 1, 6)], ...parts(money, 'Highlights') }),
  // ── Finance: ledger ──
  define({ id: 'finance.recent', module: 'finance', tab: 'ledger', title: 'Recent transactions', description: 'The latest rows in your ledger.', settings: [count('How many', 6, 3, 12)], ...parts(finance, 'Recent') }),
  define({ id: 'ledger.spend', module: 'finance', tab: 'ledger', title: 'Recent spending', description: 'What you spent lately, against the same stretch before.', sizes: ['s', 'm'], settings: [{ key: 'days', type: 'select', label: 'Look back', default: '7', options: [['7', '7 days'], ['14', '14 days'], ['30', '30 days']] }], multi: true, ...parts(finance, 'Spend') }),
  // ── Finance: payments ──
  define({ id: 'finance.comingUp', module: 'finance', tab: 'payments', title: 'Upcoming payments', description: 'EMIs and bills due in the next two weeks.', ...parts(money, 'ComingUp') }),
  define({ id: 'payments.monthly', module: 'finance', tab: 'payments', title: 'Fixed each month', description: 'What goes out every month in EMIs, bills and subscriptions.', sizes: ['s', 'm'], ...parts(money, 'MonthlyCommitments') }),
  // ── Finance: goals ──
  define({ id: 'goals.progress', module: 'finance', tab: 'goals', title: 'Goal progress', description: 'How close a goal is, and whether you are on plan.', sizes: ['m', 'l'], multi: true, settings: [{ key: 'goalId', type: 'goal', label: 'Goal', default: 'all' }, { key: 'count', type: 'select', label: 'Goals to show', default: 2, options: [[1, '1'], [2, '2'], [3, '3']] }], ...parts(money, 'GoalProgress') }),
  // ── Daily Scoop ──
  define({ id: 'live.weather', module: 'scoop', tab: 'live', title: 'Weather', description: 'Now and the next three days for your city.', sizes: ['s', 'm'], ...parts(live, 'Weather') }),
  define({ id: 'live.rates', module: 'scoop', tab: 'live', title: 'Exchange rates', description: 'Your chosen currencies against the rupee.', sizes: ['s', 'm'], settings: [count('How many', 4, 1, 8)], ...parts(live, 'Rates') }),
  define({ id: 'live.crypto', module: 'scoop', tab: 'live', title: 'Crypto', description: 'Prices for the coins you follow.', sizes: ['s', 'm'], settings: [count('How many', 4, 1, 8)], ...parts(live, 'Crypto') }),
  define({ id: 'live.news', module: 'scoop', tab: 'live', title: 'News', description: 'Latest headlines for your topic.', sizes: ['m', 'l'], settings: [count('How many', 4, 1, 8)], ...parts(live, 'News') }),
  // ── Tasks ──
  define({ id: 'tasks.hunterCard', module: 'tasks', tab: 'profile', title: 'Hunter card', description: 'Your rank, level and XP bar.', sizes: ['s', 'm'], defaultSize: 's', ...parts(tasks, 'HunterCard') }),
  define({ id: 'tasks.dailyQuest', module: 'tasks', tab: 'today', title: 'Daily Quest', description: 'Today’s quest lines, the day-close countdown and your chain.', sizes: ['m', 'l'], ...parts(tasks, 'DailyQuest') }),
  define({ id: 'tasks.today', module: 'tasks', tab: 'today', title: 'Today’s quests', description: 'Tasks due today and overdue, with tick boxes.', sizes: ['m', 'l'], settings: [count('How many', 5, 3, 10)], ...parts(tasks, 'TodayTasks') }),
  define({ id: 'tasks.streaks', module: 'tasks', tab: 'habits', title: 'Streaks', description: 'Your longest-running habits, with quick check-in.', sizes: ['s', 'm'], settings: [count('How many', 4, 2, 8)], ...parts(tasks, 'Streaks') }),
  define({ id: 'tasks.activity', module: 'tasks', tab: 'profile', title: 'XP activity', description: 'A twelve-week heatmap of the XP you earned.', sizes: ['m', 'l'], ...parts(tasks, 'Activity') }),
  define({ id: 'tasks.awards', module: 'tasks', tab: 'awards', title: 'Recent awards', description: 'The last awards you unlocked.', sizes: ['s', 'm'], defaultSize: 's', ...parts(tasks, 'Awards') }),
];

export const WIDGET_BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));

const tabLabel = (moduleId, tabId) => {
  if (tabId === 'overview') return 'Overview';
  const module = MODULES.find((m) => m.id === moduleId);
  return module?.tabs.find((t) => t.path === tabId)?.label || tabId;
};

/** The picker's groups: module, then sub-tab, each with its widgets, in registry order. */
export function groupWidgets(widgets = WIDGETS) {
  return MODULES.map((module) => {
    const mine = widgets.filter((w) => w.module === module.id);
    const tabs = [...new Set(mine.map((w) => w.tab))];
    return { module, tabs: tabs.map((tab) => ({ id: tab, label: tabLabel(module.id, tab), widgets: mine.filter((w) => w.tab === tab) })) };
  }).filter((g) => g.tabs.length);
}

/** Tabs that may never contribute a widget (Imports and Sort out). */
export const widgetFreeTabs = () => MODULES.flatMap((m) => m.tabs.filter((t) => t.widgets === false).map((t) => `${m.id}/${t.path}`));
