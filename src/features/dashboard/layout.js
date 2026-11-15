// The dashboard's saved layout (users.dashboard_config, version 2): an ordered list of widget
// instances. Order is layout; a widget that is hidden is simply absent. Version 1 (the original
// finance-only list with enabled flags) is migrated on read and written back as version 2 the
// next time the dashboard is saved.
import { WIDGETS as V1_WIDGETS } from './dashboardConfig.js';

export const SIZES = ['s', 'm', 'l', 'full'];
export const SIZE_LABELS = { s: 'Small', m: 'Medium', l: 'Large', full: 'Full width' };
export const MAX_ITEMS = 40;

const KEY_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const newKey = () => Array.from({ length: 8 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join('');

export const makeItem = (widget, size, settings = {}, key = newKey()) => ({ key, widget, size, settings });

// The layout a brand-new account sees: the original finance widgets, then a pair of Tasks widgets.
const V1_SIZE = { full: 'full' };
const DEFAULT_SETTINGS = { balance: { period: '6m' }, breakdown: { period: 'latest', account: 'all', metric: 'expense' }, cashflow: { period: '6m', account: 'all' }, trend: { period: '6m', account: 'all', metric: 'expense' } };
export function defaultItems() {
  return [
    ...V1_WIDGETS.map((w) => makeItem(`finance.${w.id}`, V1_SIZE[w.width] || 'm', DEFAULT_SETTINGS[w.id] || {}, w.id)),
    makeItem('tasks.hunterCard', 's', {}, 'hunter'),
    makeItem('tasks.dailyQuest', 'm', {}, 'quest'),
  ];
}

/** Version 1 -> version 2: keep the enabled widgets in their saved order, as finance widgets. */
export function migrateV1(saved) {
  const known = new Map(V1_WIDGETS.map((w) => [w.id, w]));
  return (saved.widgets || [])
    .filter((w) => w.enabled && known.has(w.id))
    .map((w) => {
      const def = known.get(w.id);
      const settings = {};
      if (def.period) settings.period = w.period;
      if (def.account) settings.account = w.account;
      if (def.metric) settings.metric = w.metric;
      return makeItem(`finance.${w.id}`, w.width === 'full' ? 'full' : 'm', settings, w.id);
    });
}

/** Whatever is saved (nothing, v1 or v2) -> { version: 2, items }. */
export function normalizeConfig(saved) {
  if (!saved) return { version: 2, items: defaultItems() };
  if (saved.version === 2 && Array.isArray(saved.items)) return { version: 2, items: saved.items.map(cleanItem).filter(Boolean).slice(0, MAX_ITEMS) };
  if (saved.version === 1) return { version: 2, items: migrateV1(saved) };
  return { version: 2, items: defaultItems() };
}

function cleanItem(item) {
  if (!item || typeof item.widget !== 'string' || typeof item.key !== 'string') return null;
  return { key: item.key, widget: item.widget, size: SIZES.includes(item.size) ? item.size : 'm', settings: item.settings && typeof item.settings === 'object' ? item.settings : {} };
}

/**
 * Pairs each saved item with its registry definition and fills in defaults, so a widget always
 * renders with complete settings and an allowed size. Items whose widget the registry doesn't know
 * (a newer client wrote them) are left out of the board but kept in the saved list.
 */
export function resolveItems(items, byId) {
  return items.flatMap((item) => {
    const def = byId.get(item.widget);
    if (!def) return [];
    const settings = Object.fromEntries(def.settings.map((s) => [s.key, item.settings?.[s.key] ?? s.default]));
    const size = def.sizes.includes(item.size) ? item.size : def.defaultSize;
    return [{ item, def, settings, size }];
  });
}

export const sameItems = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Moves the item with `key` by `delta` places among the items the board actually shows
 * (`isKnown`), so a saved widget this client can't render never swallows a move.
 */
export function moveItem(items, key, delta, isKnown = () => true) {
  const index = items.findIndex((i) => i.key === key);
  if (index < 0) return items;
  const step = Math.sign(delta);
  let target = index + step;
  while (target >= 0 && target < items.length && !isKnown(items[target])) target += step;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
