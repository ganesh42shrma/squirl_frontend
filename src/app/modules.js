// The single source of truth for navigation. The header launcher, the sub-tab row, the routes and
// the dashboard's widget groups all read this list, so adding a module (or a page inside one) is
// one edit here. Dashboard and Settings stay top-level; everything else lives inside a module.
import { lazy } from 'react';
import { GearSix, House, Newspaper, Wallet, Sword } from '@phosphor-icons/react';
import { APP, financePath, tasksPath, scoopPath, SETTINGS_PATH, settingsPath, goalPath, CUSTOMIZE_DASHBOARD_PATH } from './paths';

export * from './paths';

const page = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));

const LedgerPage = page(() => import('../features/ledger/LedgerPage'), 'LedgerPage');
const InsightsPage = page(() => import('../features/insights/InsightsPage'), 'InsightsPage');
const CommitmentsPage = page(() => import('../features/commitments/CommitmentsPage'), 'CommitmentsPage');
const GoalsPage = page(() => import('../features/goals/GoalsPage'), 'GoalsPage');
const GoalDetailPage = page(() => import('../features/goals/GoalDetailPage'), 'GoalDetailPage');
const LivePage = page(() => import('../features/live/LivePage'), 'LivePage');
const ImportsPage = page(() => import('../features/imports/ImportsPage'), 'ImportsPage');
const SortOutPage = page(() => import('../features/sortout/SortOutPage'), 'SortOutPage');
const TodayPage = page(() => import('../features/tasks/TodayPage'), 'TodayPage');
const ListsPage = page(() => import('../features/tasks/ListsPage'), 'ListsPage');
const HabitsPage = page(() => import('../features/tasks/HabitsPage'), 'HabitsPage');
const HunterPage = page(() => import('../features/tasks/HunterPage'), 'HunterPage');
const AwardsPage = page(() => import('../features/tasks/AwardsPage'), 'AwardsPage');

/*
 * tab fields:
 *   path     the segment under the module's base
 *   label    the sub-tab text
 *   page     the lazy component rendered there
 *   also     extra routes inside this tab (detail pages)
 *   group    'maintain' puts the tab after a divider
 *   widgets  false keeps the tab out of the dashboard widget catalogue (Imports and Sort out)
 */
export const MODULES = [
  {
    id: 'finance',
    label: 'Finance',
    base: `${APP}/finance`,
    icon: Wallet,
    blurb: 'Ledger, goals, bills and live data',
    // Live moved out to its own module (Daily Scoop); old finance/live bookmarks still land there.
    redirects: [{ from: 'live', to: scoopPath('live') }],
    quick: [
      { label: 'Add a transaction', to: financePath('ledger') },
      { label: 'Import a statement', to: financePath('imports') },
    ],
    tabs: [
      { path: 'ledger', label: 'Ledger', page: LedgerPage },
      { path: 'highlights', label: 'Highlights', page: InsightsPage },
      { path: 'payments', label: 'EMIs & bills', page: CommitmentsPage },
      { path: 'goals', label: 'Goals', page: GoalsPage, also: [{ path: 'goals/:id', page: GoalDetailPage }] },
      { path: 'imports', label: 'Imports', page: ImportsPage, group: 'maintain', widgets: false },
      { path: 'sort-out', label: 'Sort out', page: SortOutPage, group: 'maintain', widgets: false },
    ],
  },
  {
    id: 'tasks',
    label: 'Tasks',
    base: `${APP}/tasks`,
    icon: Sword,
    blurb: 'Quests, habits and your hunter rank',
    quick: [
      { label: 'New task', to: tasksPath('today', '?new=1') },
      { label: 'New habit', to: tasksPath('habits', '?new=1') },
    ],
    tabs: [
      { path: 'today', label: 'Today', page: TodayPage },
      { path: 'lists', label: 'Lists', page: ListsPage },
      { path: 'habits', label: 'Streaks', page: HabitsPage },
      { path: 'profile', label: 'Hunter', page: HunterPage },
      { path: 'awards', label: 'Awards', page: AwardsPage },
    ],
  },
  {
    id: 'scoop',
    label: 'Daily Scoop',
    shortLabel: 'Scoop',
    base: `${APP}/scoop`,
    icon: Newspaper,
    blurb: 'Weather, markets, news and more',
    quick: [{ label: 'Data sources', to: settingsPath('data-sources') }],
    tabs: [{ path: 'live', label: 'Live', page: LivePage }],
  },
];

// Mobile tab bar: the dashboard, every module (shortLabel if set) and Settings. Built from MODULES, so a new module appears automatically.
export const mobileTabs = () => [
  { id: 'dashboard', label: 'Home', to: APP, end: true, icon: House },
  ...MODULES.map((m) => ({ id: m.id, label: m.shortLabel || m.label, to: `${m.base}/${m.tabs[0].path}`, base: m.base, icon: m.icon })),
  { id: 'settings', label: 'Settings', to: SETTINGS_PATH, icon: GearSix },
];

// The dashboard is top-level. Settings lives in the account menu, not the module menu.
export const TOP_LEVEL = [{ id: 'dashboard', label: 'Dashboard', to: APP, blurb: 'Your board of widgets' }];

export const moduleById = (id) => MODULES.find((m) => m.id === id);

/** The module whose base contains this pathname, if any. */
export function moduleForPath(pathname) {
  return MODULES.find((m) => pathname === m.base || pathname.startsWith(`${m.base}/`)) || null;
}

/** The tab (and its module) a pathname is on. */
export function tabForPath(pathname) {
  const module = moduleForPath(pathname);
  if (!module) return {};
  const rest = pathname.slice(module.base.length + 1);
  const tab = module.tabs.find((t) => rest === t.path || rest.startsWith(`${t.path}/`)) || null;
  return { module, tab };
}

// Where the old top-level URLs went. Query string and hash are kept by the redirect component.
export const LEGACY_REDIRECTS = [
  ...['ledger', 'highlights', 'payments', 'goals', 'imports', 'sort-out'].map((tab) => ({ from: tab, to: financePath(tab) })),
  { from: 'live', to: scoopPath('live') },
  { from: 'insights', to: financePath('highlights') },
  { from: 'goals/:id', to: (params) => goalPath(params.id) },
  { from: 'profile/dashboard', to: CUSTOMIZE_DASHBOARD_PATH },
];
