import assert from 'node:assert/strict';
import { defaults, getConfig, widgetRange, categorySlices } from '../src/features/dashboard/dashboardConfig.js';
import { MOCK_DATA, mockChartData } from '../src/features/dashboard/mockDashboard.js';
import { createServer } from 'vite';
import { defaultItems, migrateV1, moveItem, normalizeConfig, resolveItems, sameItems, makeItem, MAX_ITEMS } from '../src/features/dashboard/layout.js';

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

// ── Layout v2 (an ordered list of widget instances) ──
const fresh = normalizeConfig(null);
assert.equal(fresh.version, 2);
assert.equal(fresh.items.length, 13); assert.equal(new Set(fresh.items.map((i) => i.key)).size, 13);
assert.deepEqual(fresh.items.slice(0, 11).map((i) => i.widget), base.widgets.map((w) => `finance.${w.id}`), 'new accounts start with the original finance widgets, in order');
assert.ok(fresh.items.some((i) => i.widget === 'tasks.hunterCard') && fresh.items.some((i) => i.widget === 'tasks.dailyQuest'));
assert.equal(fresh.items.find((i) => i.widget === 'finance.overview').size, 'full');
assert.equal(fresh.items.find((i) => i.widget === 'finance.breakdown').size, 'm');

// v1 -> v2: keep only the enabled widgets, in saved order, as finance widgets with their period/account/metric.
const v1 = { version: 1, widgets: [
  { id: 'cashflow', enabled: true, width: 'full', period: '12m', account: 'sbi', metric: 'expense' },
  { id: 'overview', enabled: false, width: 'full', period: '6m', account: 'all', metric: 'expense' },
  { id: 'breakdown', enabled: true, width: 'half', period: '3m', account: 'all', metric: 'income' },
  { id: 'monthStats', enabled: true, width: 'half', period: '6m', account: 'all', metric: 'expense' },
  { id: 'notAWidget', enabled: true, width: 'half', period: '6m', account: 'all', metric: 'expense' },
] };
const migrated = normalizeConfig(v1);
assert.deepEqual(migrated.items.map((i) => [i.widget, i.size]), [['finance.cashflow', 'full'], ['finance.breakdown', 'm'], ['finance.monthStats', 'm']]);
assert.deepEqual(migrated.items[0].settings, { period: '12m', account: 'sbi' }, 'only the settings a widget actually has');
assert.deepEqual(migrated.items[1].settings, { period: '3m', account: 'all', metric: 'income' });
assert.deepEqual(migrated.items[2].settings, {});
assert.deepEqual(normalizeConfig(v1), migrated, 'migration is deterministic');
assert.deepEqual(migrateV1({ widgets: [] }), []);

// v2 passes through; junk is cleaned; unknown versions fall back to the default.
const v2 = { version: 2, items: [{ key: 'a1', widget: 'goals.progress', size: 'xl', settings: { goalId: 'all' } }, { key: 'b2', widget: 'tasks.streaks', size: 's', settings: {} }, { widget: 'broken' }, null] };
const kept = normalizeConfig(v2);
assert.deepEqual(kept.items.map((i) => [i.key, i.size]), [['a1', 'm'], ['b2', 's']], 'a bad size becomes medium and malformed items are dropped');
assert.deepEqual(normalizeConfig({ version: 9 }), { version: 2, items: defaultItems().map((i) => ({ ...i, key: i.key })) });
assert.equal(normalizeConfig({ version: 2, items: [] }).items.length, 0, 'an empty board is a valid board');

// Rendering: unknown widget ids are skipped (but stay in the saved list); settings are filled and sizes clamped.
const registry = new Map([['goals.progress', { id: 'goals.progress', sizes: ['m', 'l'], defaultSize: 'm', settings: [{ key: 'goalId', default: 'all' }, { key: 'count', default: 2 }] }]]);
const resolved = resolveItems([makeItem('goals.progress', 'full', { count: 3 }, 'k1'), makeItem('future.widget', 'm', {}, 'k2')], registry);
assert.equal(resolved.length, 1); assert.equal(resolved[0].size, 'm'); assert.deepEqual(resolved[0].settings, { goalId: 'all', count: 3 });

// Reordering skips widgets this client can't show.
const row = ['a', 'ghost', 'b'].map((k) => makeItem(k === 'ghost' ? 'future.widget' : `finance.${k}`, 'm', {}, k));
const known = (i) => i.widget !== 'future.widget';
assert.deepEqual(moveItem(row, 'a', 1, known).map((i) => i.key), ['b', 'ghost', 'a']);
assert.deepEqual(moveItem(row, 'b', -1, known).map((i) => i.key), ['b', 'ghost', 'a']);
assert.equal(moveItem(row, 'a', -1, known), row); assert.equal(moveItem(row, 'b', 1, known), row);
assert.ok(sameItems(row, [...row]) && !sameItems(row, moveItem(row, 'a', 1, known)));
assert.equal(MAX_ITEMS, 40);

// ── The widget registry (loaded through Vite so its JSX and lazy imports resolve) ──
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { WIDGETS, WIDGET_BY_ID, groupWidgets, widgetFreeTabs } = await server.ssrLoadModule('/src/features/dashboard/registry.js');
  const { DASHBOARD_TEMPLATES, makeTemplateItems } = await server.ssrLoadModule('/src/features/dashboard/templates.js');
  const { MODULES } = await server.ssrLoadModule('/src/app/modules.js');
  const backendId = /^[a-z][a-z0-9]{0,29}\.[A-Za-z][A-Za-z0-9]{0,39}$/; // the backend's only rule about widget ids
  assert.ok(WIDGETS.length >= 25, 'a catalogue spanning several modules');
  assert.equal(new Set(WIDGETS.map((w) => w.id)).size, WIDGETS.length, 'ids are unique');
  for (const w of WIDGETS) {
    assert.match(w.id, backendId, `${w.id} is a valid stored id`);
    assert.ok(w.sizes.includes(w.defaultSize), `${w.id}: default size is allowed`);
    assert.ok(w.sizes.every((s) => ['s', 'm', 'l', 'full'].includes(s)));
    assert.equal(new Set(w.settings.map((x) => x.key)).size, w.settings.length);
    assert.ok(w.settings.every((x) => x.default !== undefined), `${w.id}: every setting has a default`);
    assert.ok(w.component && w.preview && w.title && w.description, `${w.id}: has components, a title and a description`);
    const module = MODULES.find((m) => m.id === w.module);
    assert.ok(module, `${w.id}: belongs to a real module`);
    if (w.tab !== 'overview') {
      const tab = module.tabs.find((t) => t.path === w.tab);
      assert.ok(tab, `${w.id}: belongs to a real sub-tab`);
      assert.notEqual(tab.widgets, false, `${w.id}: Imports and Sort out contribute no widgets`);
    }
  }
  assert.deepEqual(widgetFreeTabs().sort(), ['finance/imports', 'finance/sort-out']);
  assert.ok(!WIDGETS.some((w) => ['imports', 'sort-out'].includes(w.tab)));
  for (const id of base.widgets.map((x) => x.id)) assert.ok(WIDGET_BY_ID.has(`finance.${id}`), `the original widget "${id}" is still in the registry`);
  for (const item of fresh.items) assert.ok(WIDGET_BY_ID.has(item.widget), `${item.widget} (default layout) exists`);
  const modulesWithWidgets = new Set(WIDGETS.map((w) => w.module));
  assert.ok(modulesWithWidgets.has('finance') && modulesWithWidgets.has('tasks'));
  const tabsCovered = new Set(WIDGETS.filter((w) => w.module === 'finance').map((w) => w.tab));
  for (const tab of ['ledger', 'highlights', 'payments', 'goals']) assert.ok(tabsCovered.has(tab), `Finance > ${tab} offers a widget`);
  assert.ok(!tabsCovered.has('live'), 'Live is no longer part of Finance');
  assert.ok(WIDGETS.filter((w) => w.module === 'scoop').length >= 4, 'the Daily Scoop module offers the live widgets');
  assert.deepEqual(groupWidgets().map((g) => g.module.id), ['finance', 'tasks', 'scoop']);
  assert.deepEqual(MODULES.find((m) => m.id === 'finance').tabs.map((t) => t.path), ['ledger', 'highlights', 'payments', 'goals', 'imports', 'sort-out']);
  assert.deepEqual(MODULES.find((m) => m.id === 'scoop').tabs.map((t) => t.path), ['live']);
  assert.equal(groupWidgets().flatMap((g) => g.tabs.flatMap((t) => t.widgets)).length, WIDGETS.length, 'every widget appears in the picker');

  // Every ready-made board must work without fixing sizes, settings, or account-specific ids.
  assert.equal(DASHBOARD_TEMPLATES.length, 4);
  assert.equal(new Set(DASHBOARD_TEMPLATES.map((t) => t.id)).size, 4);
  const sourceTemplates = JSON.stringify(DASHBOARD_TEMPLATES);
  for (const template of DASHBOARD_TEMPLATES) {
    const items = makeTemplateItems(template);
    const again = makeTemplateItems(template);
    assert(items.length > 0 && items.length <= MAX_ITEMS);
    assert.equal(new Set(items.map((i) => i.key)).size, items.length);
    assert(items.every((item, index) => item.key !== again[index].key), 'each application gets fresh widget instances');
    assert.deepEqual(JSON.parse(JSON.stringify(normalizeConfig({ version: 2, items }).items)), JSON.parse(JSON.stringify(items)), 'templates use the existing saved format');
    const entries = resolveItems(items, WIDGET_BY_ID);
    assert.equal(entries.length, items.length, `${template.name}: no missing widgets`);
    for (const { item, def, size, settings } of entries) {
      assert.equal(size, item.size, `${template.name}: ${def.title} uses an allowed size`);
      assert.deepEqual(settings, item.settings, 'all widget settings are configured before saving');
      assert.equal(Object.keys(settings).length, def.settings.length);
      for (const setting of def.settings) {
        const value = settings[setting.key];
        if (setting.type === 'number') assert(Number.isInteger(value) && value >= setting.min && value <= setting.max);
        if (setting.type === 'period') assert(['latest', '3m', '6m', '12m', 'all'].includes(value));
        if (setting.type === 'metric') assert(['expense', 'income', 'investment'].includes(value));
        if (setting.type === 'account' || setting.type === 'goal') assert.equal(value, 'all', 'no personal ids in a shared template');
        if (setting.type === 'select') assert(setting.options.some((o) => (Array.isArray(o) ? o[0] : o) === value));
      }
    }
    items[0].size = 'full'; items[0].settings.example = 'edited'; items.pop();
    assert.equal(JSON.stringify(DASHBOARD_TEMPLATES), sourceTemplates, 'editing a chosen template never changes the reusable template');
    assert(!Object.hasOwn(again[0].settings, 'example'));
  }
} finally {
  await server.close();
}

console.log('Passed: widget defaults/order/visibility, saved layout compatibility, v1->v2 migration, registry invariants, four ready-made templates with complete valid settings and independent instances, reordering, periods, account ranges, chart metrics/refunds, category totals and mock data.');
