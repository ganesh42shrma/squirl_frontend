import assert from 'node:assert/strict';
import { activeFilterCount, buildChips, clearedFilters, financialYear, parseFilters, rangeFor, toParams, toQuery, toSummaryQuery } from '../src/features/ledger/ledgerFilters.js';

const month = '2026-11';
const parse = (qs) => parseFilters(new URLSearchParams(qs), month);

// Defaults: this month, nothing filtered, newest first.
const base = parse('');
assert.equal(base.preset, 'month'); assert.equal(base.month, month); assert.equal(base.sort, '-date'); assert.equal(activeFilterCount(base), 0);
assert.deepEqual(toQuery(base, month, 30), { from: '2026-11-01', to: '2026-11-30', sort: '-date', page: 1, limit: 30, search: undefined, searchIn: undefined, type: undefined, category: undefined, tag: undefined, account: undefined, person: undefined, source: undefined, importId: undefined, minAmount: undefined, maxAmount: undefined, hasNotes: undefined, auto: undefined });
assert.equal(toParams(base, month).toString(), '', 'defaults leave the URL clean');

// Date presets, including Indian financial years and a leap February.
assert.deepEqual(rangeFor(parse('month=2024-02'), month), { from: '2024-02-01', to: '2024-02-29' });
assert.deepEqual(rangeFor(parse('preset=last3'), month), { from: '2026-09-01', to: '2026-11-30' });
assert.deepEqual(rangeFor(parse('preset=last6'), '2026-02'), { from: '2025-09-01', to: '2026-02-28' });
assert.deepEqual(rangeFor(parse('preset=fy'), '2026-11'), { from: '2026-04-01', to: '2027-03-31', label: 'FY 2026–27' });
assert.deepEqual(rangeFor(parse('preset=fy'), '2026-03'), { from: '2025-04-01', to: '2026-03-31', label: 'FY 2025–26' }, 'January to March belong to the year that began the April before');
assert.deepEqual(rangeFor(parse('preset=lastfy'), '2026-11'), { from: '2025-04-01', to: '2026-03-31', label: 'FY 2025–26' });
assert.deepEqual(rangeFor(parse('preset=all'), month), {});
assert.deepEqual(rangeFor(parse('from=2026-01-05&to=2026-02-10'), month), { from: '2026-01-05', to: '2026-02-10' }, 'from/to alone mean a custom range');
assert.deepEqual(rangeFor(parse('preset=custom&from=2026-01-05'), month), { from: '2026-01-05' }, 'an open-ended custom range');
assert.equal(parse('from=2026-1-5').preset, 'month', 'a malformed date is ignored');
assert.equal(financialYear('2026-04').from, '2026-04-01');

// A rich filter set survives URL -> filters -> URL -> filters, and maps onto the API's names.
const rich = parse('q=zomato&in=notes&type=debit&min=500&max=5000&category=none&tag=food&account=sbi&source=import&import=abc123&notes=1&auto=1&sort=amount&page=3&limit=50&preset=last3');
assert.deepEqual(rich.min, 500); assert.equal(rich.max, 5000); assert.equal(rich.hasNotes, true); assert.equal(rich.searchIn, 'notes');
assert.deepEqual(parse(toParams(rich, month).toString()), rich);
const query = toQuery(rich, month, 50);
assert.equal(query.search, 'zomato'); assert.equal(query.searchIn, 'notes'); assert.equal(query.minAmount, 500); assert.equal(query.maxAmount, 5000);
assert.equal(query.hasNotes, true); assert.equal(query.importId, 'abc123'); assert.equal(query.category, 'none'); assert.equal(query.limit, 50); assert.equal(query.page, 3);
assert.equal(activeFilterCount(rich), 10);
const summary = toSummaryQuery(rich, month);
assert.equal(summary.groupBy, 'categoryType'); assert.ok(!('page' in summary) && !('limit' in summary) && !('sort' in summary));
assert.equal(summary.minAmount, 500);
// "Payments with this person" (from the palette or a link) round-trips and shows as its own chip.
const withPerson = parse('person=abc123&preset=all');
assert.equal(withPerson.person, 'abc123');
assert.equal(toQuery(withPerson, month).person, 'abc123');
assert.equal(toSummaryQuery(withPerson, month).person, 'abc123', 'totals describe exactly the rows shown');
assert.deepEqual(parse(toParams(withPerson, month).toString()), withPerson);
assert.equal(activeFilterCount(withPerson), 1);
assert.deepEqual(buildChips(withPerson, { person: () => 'Ramesh' }).map((c) => [c.id, c.name, c.value, c.patch]), [['person', 'With', 'Ramesh', { person: '' }]]);
assert.equal(buildChips(withPerson)[0].value, 'Someone in your circle', 'a name that has not loaded yet still reads sensibly');
assert.equal(clearedFilters(withPerson).person, '');
// A zero amount is a real bound, not "unset".
assert.equal(parse('min=0').min, 0); assert.equal(toQuery(parse('min=0&max=0'), month).maxAmount, 0);
assert.equal(parse('min=-5').min, null); assert.equal(parse('min=abc').min, null);
// searchIn only matters with a search, but the choice is remembered before you type.
assert.equal(toParams(parse('in=notes'), month).get('in'), 'notes');
assert.equal(toQuery(parse('in=notes'), month).searchIn, undefined);

// Older links keep working: statement view, "needs sorting", automatic view and the old importId name.
const legacyImport = parse('importId=imp1');
assert.equal(legacyImport.importId, 'imp1'); assert.equal(legacyImport.preset, 'all', 'a statement link spans every date, as before');
assert.deepEqual(rangeFor(legacyImport, month), {});
assert.equal(parse('view=unsorted').category, 'none'); assert.equal(parse('view=unsorted').preset, 'all');
assert.equal(parse('view=auto').auto, true);
assert.equal(parse('category=abc&month=2026-10').category, 'abc'); assert.equal(parse('category=abc&month=2026-10').month, '2026-10');
assert.equal(toParams(legacyImport, month).get('import'), 'imp1'); assert.equal(toParams(legacyImport, month).has('preset'), false, 'the statement view stays all-time without saying so');

// Chips: one per filter, each removable by its own patch, labelled with names where known.
const names = { category: (id) => (id === 'cat1' ? 'Food › Groceries' : ''), statement: () => 'SBI Oct 2026.pdf', account: (a) => a.toUpperCase() };
const chips = buildChips({ ...rich, category: 'cat1' }, names);
assert.deepEqual(chips.map((c) => c.id), ['q', 'type', 'amount', 'category', 'tag', 'account', 'import', 'source', 'notes', 'auto']);
assert.equal(chips.find((c) => c.id === 'amount').value, '₹500 – ₹5,000');
assert.equal(chips.find((c) => c.id === 'import').value, 'SBI Oct 2026.pdf');
assert.equal(chips.find((c) => c.id === 'q').value, '“zomato” in notes');
assert.equal(chips.find((c) => c.id === 'category').value, 'Food › Groceries');
assert.equal(buildChips(parse('min=100'), names)[0].value, 'At least ₹100');
assert.equal(buildChips(parse('max=100'), names)[0].value, 'Up to ₹100');
assert.equal(buildChips(parse('category=none'), names)[0].value, 'Not sorted yet');
for (const chip of chips) {
  const after = { ...rich, category: 'cat1', ...chip.patch };
  assert.equal(buildChips(after, names).some((c) => c.id === chip.id), false, `removing ${chip.id} removes only that chip`);
  assert.equal(buildChips(after, names).length, chips.length - 1);
}
const cleared = clearedFilters(rich);
assert.equal(buildChips(cleared, names).length, 0); assert.equal(cleared.preset, rich.preset); assert.equal(cleared.sort, rich.sort); assert.equal(cleared.page, 1);
console.log('Passed: URL<->filter round trips, date presets and financial years, amount/search-scope/notes/statement filters, legacy links, removable chips and the API query.');
