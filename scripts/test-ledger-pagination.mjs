import assert from 'node:assert/strict';
import { initialPagination, paginationReducer as reduce, paginationInfo, LEDGER_PAGE_SIZES } from '../src/features/ledger/ledgerPaging.js';
assert.deepEqual(LEDGER_PAGE_SIZES, [30, 50, 100, 200]);
let state = reduce(initialPagination, { type: 'scope', scope: 'november' });
assert.equal(state.limit, 30);
state = reduce(state, { type: 'page', scope: 'november', page: 8 });
assert.deepEqual(paginationInfo(state.page, state.limit, 235), { pages: 8, current: 8, from: 211, to: 235 });
// Filters, sort, month and focused views all change the query scope.
for (const scope of ['search-gift', 'category-food', 'tag-home', 'october', 'sort-amount', 'import-123', 'unsorted', 'automatic']) {
  state = reduce(state, { type: 'scope', scope });
  assert.equal(state.page, 1);
  state = reduce(state, { type: 'page', scope, page: 3 });
  assert.equal(reduce(state, { type: 'scope', scope }), state, 'background refresh keeps the current page');
}
for (const limit of LEDGER_PAGE_SIZES) {
  state = reduce(state, { type: 'limit', scope: state.scope, limit });
  assert.equal(state.page, 1); assert.equal(state.limit, limit);
}
assert.equal(reduce(state, { type: 'limit', limit: 500 }), state);
assert.deepEqual(paginationInfo(1, 30, 0), { pages: 1, current: 1, from: 0, to: 0 });
assert.deepEqual(paginationInfo(2, 30, 30), { pages: 1, current: 1, from: 1, to: 30 }, 'last-page deletion clamps to an existing page');
assert.deepEqual(paginationInfo(2, 50, 100), { pages: 2, current: 2, from: 51, to: 100 });
console.log('Passed: 30/50/100/200 page sizes, filter/sort/view resets, background refresh, last-page deletion and empty result ranges.');
