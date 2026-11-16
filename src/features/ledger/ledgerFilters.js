// Ledger filters as a pure model: URL params <-> filter object <-> API query <-> removable chips.
// Everything that shapes the list lives in the URL (so links share, Back works and a refresh keeps
// the view); this file has no React and no DOM, so it can be tested on its own.
import { monthRange, shiftMonth } from '../../lib/format.js';

export const PRESETS = [
  { id: 'month', label: 'A month' },
  { id: 'last3', label: 'Last 3 months' },
  { id: 'last6', label: 'Last 6 months' },
  { id: 'fy', label: 'This financial year' },
  { id: 'lastfy', label: 'Last financial year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom range' },
];
export const SEARCH_SCOPES = [
  { id: 'all', label: 'Everything' },
  { id: 'description', label: 'Description' },
  { id: 'notes', label: 'Notes' },
  { id: 'ref', label: 'Reference no.' },
];
export const SORTS = ['-date', 'date', '-amount', 'amount'];
export const PAGE_SIZES = [30, 50, 100, 200];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

// Indian financial year: 1 April - 31 March. `month` is a 'YYYY-MM' key; the result names the year it starts.
export function financialYear(month, offset = 0) {
  const [year, m] = month.split('-').map(Number);
  const start = (m >= 4 ? year : year - 1) + offset;
  return { from: `${start}-04-01`, to: `${start + 1}-03-31`, label: `FY ${start}–${String(start + 1).slice(2)}` };
}

/** The from/to a preset covers (undefined bounds mean "no limit"). */
export function rangeFor(filters, currentMonth) {
  switch (filters.preset) {
    case 'month': return monthRange(filters.month || currentMonth);
    case 'last3': return { from: monthRange(shiftMonth(currentMonth, -2)).from, to: monthRange(currentMonth).to };
    case 'last6': return { from: monthRange(shiftMonth(currentMonth, -5)).from, to: monthRange(currentMonth).to };
    case 'fy': return financialYear(currentMonth);
    case 'lastfy': return financialYear(currentMonth, -1);
    case 'custom': return { ...(filters.from && { from: filters.from }), ...(filters.to && { to: filters.to }) };
    default: return {};
  }
}

/**
 * URL params -> filters. Understands the older links too: ?month=, ?importId=, ?view=unsorted|auto,
 * ?category=. A statement or "needs sorting" view with no date asks for all time, as before.
 */
export function parseFilters(params, currentMonth) {
  const get = (key) => params.get(key) || '';
  const view = get('view');
  const importId = get('import') || get('importId');
  const from = DATE.test(get('from')) ? get('from') : '';
  const to = DATE.test(get('to')) ? get('to') : '';
  let preset = get('preset');
  if (!PRESETS.some((p) => p.id === preset)) preset = from || to ? 'custom' : importId || view ? 'all' : 'month';
  const num = (key) => (get(key) !== '' && Number.isFinite(Number(get(key))) && Number(get(key)) >= 0 ? Number(get(key)) : null);
  const sort = SORTS.includes(get('sort')) ? get('sort') : '-date';
  const limit = PAGE_SIZES.includes(Number(get('limit'))) ? Number(get('limit')) : null;
  return {
    preset,
    month: MONTH.test(get('month')) ? get('month') : currentMonth,
    from,
    to,
    q: get('q'),
    searchIn: SEARCH_SCOPES.some((s) => s.id === get('in')) ? get('in') : 'all',
    type: ['debit', 'credit'].includes(get('type')) ? get('type') : '',
    category: get('category') || (view === 'unsorted' ? 'none' : ''),
    tag: get('tag'),
    account: get('account'),
    person: get('person'), // an id from Your circle: the payments with that person
    source: ['import', 'manual'].includes(get('source')) ? get('source') : '',
    importId,
    min: num('min'),
    max: num('max'),
    hasNotes: get('notes') === '1',
    auto: get('auto') === '1' || view === 'auto',
    sort,
    page: Math.max(1, Math.floor(Number(get('page'))) || 1),
    limit,
  };
}

// Filters -> the URL params that recreate them, leaving defaults out so links stay short.
export function toParams(filters, currentMonth) {
  const params = new URLSearchParams();
  const set = (key, value) => { if (value !== '' && value !== null && value !== undefined && value !== false) params.set(key, value === true ? '1' : String(value)); };
  const defaultPreset = filters.importId ? 'all' : 'month';
  if (filters.preset !== defaultPreset) set('preset', filters.preset);
  if (filters.preset === 'month' && filters.month !== currentMonth) set('month', filters.month);
  if (filters.preset === 'custom') { set('from', filters.from); set('to', filters.to); }
  set('q', filters.q);
  if (filters.searchIn !== 'all') set('in', filters.searchIn); // kept even before any text is typed
  set('type', filters.type);
  set('category', filters.category);
  set('tag', filters.tag);
  set('account', filters.account);
  set('person', filters.person);
  set('source', filters.source);
  set('import', filters.importId);
  set('min', filters.min);
  set('max', filters.max);
  set('notes', filters.hasNotes);
  set('auto', filters.auto);
  if (filters.sort !== '-date') set('sort', filters.sort);
  if (filters.page > 1) set('page', filters.page);
  if (filters.limit) set('limit', filters.limit);
  return params;
}

/** Filters -> the /transactions (and /transactions/summary) query. `limit` is the page size to use. */
export function toQuery(filters, currentMonth, limit = 30) {
  const range = rangeFor(filters, currentMonth);
  return {
    ...range,
    search: filters.q || undefined,
    searchIn: filters.q && filters.searchIn !== 'all' ? filters.searchIn : undefined,
    type: filters.type || undefined,
    category: filters.category || undefined,
    tag: filters.tag || undefined,
    account: filters.account || undefined,
    person: filters.person || undefined,
    source: filters.source || undefined,
    importId: filters.importId || undefined,
    minAmount: filters.min ?? undefined,
    maxAmount: filters.max ?? undefined,
    hasNotes: filters.hasNotes || undefined,
    auto: filters.auto || undefined,
    sort: filters.sort,
    page: filters.page,
    limit,
  };
}

/** The same without paging, for totals. */
export function toSummaryQuery(filters, currentMonth) {
  const { sort, page, limit, ...rest } = toQuery(filters, currentMonth);
  void sort; void page; void limit;
  return { ...rest, groupBy: 'categoryType' };
}

/** Which filters (other than the date range) are on. */
export function activeFilterCount(filters) {
  return ['q', 'type', 'category', 'tag', 'account', 'person', 'source', 'importId'].filter((k) => filters[k]).length
    + (filters.min !== null || filters.max !== null ? 1 : 0) + (filters.hasNotes ? 1 : 0) + (filters.auto ? 1 : 0);
}

const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export function amountLabel(min, max) {
  if (min !== null && max !== null) return `${rupee(min)} – ${rupee(max)}`;
  if (min !== null) return `At least ${rupee(min)}`;
  return `Up to ${rupee(max)}`;
}

/**
 * One chip per active filter: { id, name, value, patch }. `patch` is the change that removes it.
 * `names` resolves ids to words: { category(id), statement(id), account(id), person(id) }.
 */
export function buildChips(filters, names = {}) {
  const chips = [];
  const add = (id, name, value, patch) => chips.push({ id, name, value, patch });
  if (filters.q) add('q', 'Search', `“${filters.q}”${filters.searchIn !== 'all' ? ` in ${SEARCH_SCOPES.find((s) => s.id === filters.searchIn).label.toLowerCase()}` : ''}`, { q: '', searchIn: 'all' });
  if (filters.type) add('type', 'Type', filters.type === 'debit' ? 'Money out' : 'Money in', { type: '' });
  if (filters.min !== null || filters.max !== null) add('amount', 'Amount', amountLabel(filters.min, filters.max), { min: null, max: null });
  if (filters.category) add('category', 'Category', filters.category === 'none' ? 'Not sorted yet' : names.category?.(filters.category) || 'Selected category', { category: '' });
  if (filters.tag) add('tag', 'Tag', filters.tag, { tag: '' });
  if (filters.account) add('account', 'Account', names.account?.(filters.account) || filters.account, { account: '' });
  if (filters.person) add('person', 'With', names.person?.(filters.person) || 'Someone in your circle', { person: '' });
  if (filters.importId) add('import', 'Statement', names.statement?.(filters.importId) || 'One statement', { importId: '' });
  if (filters.source) add('source', 'Source', filters.source === 'import' ? 'From statements' : 'Added by hand', { source: '' });
  if (filters.hasNotes) add('notes', 'Notes', 'Has notes', { hasNotes: false });
  if (filters.auto) add('auto', 'Sorting', 'Sorted automatically', { auto: false });
  return chips;
}

/** Fresh filters with everything off, keeping the date range and sort. */
export const clearedFilters = (filters) => ({
  ...filters, q: '', searchIn: 'all', type: '', category: '', tag: '', account: '', person: '', source: '', importId: '', min: null, max: null, hasNotes: false, auto: false, page: 1,
});

// The page buttons: first, last and the pages around the current one, with gaps shown as null.
export function pageWindow(current, pages, around = 1) {
  const keep = new Set([1, pages, current]);
  for (let i = 1; i <= around; i += 1) { keep.add(current - i); keep.add(current + i); }
  const sorted = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}
