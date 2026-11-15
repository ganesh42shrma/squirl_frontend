import assert from 'node:assert/strict';
import { LEDGER_PAGE_SIZES, paginationInfo, DEFAULT_PAGE_SIZE } from '../src/features/ledger/ledgerPaging.js';
import { pageWindow, PAGE_SIZES, parseFilters, toParams } from '../src/features/ledger/ledgerFilters.js';

assert.deepEqual(LEDGER_PAGE_SIZES, [30, 50, 100, 200]);
assert.deepEqual(PAGE_SIZES, LEDGER_PAGE_SIZES);
assert.equal(DEFAULT_PAGE_SIZE, 30);
assert.deepEqual(paginationInfo(8, 30, 235), { pages: 8, current: 8, from: 211, to: 235 });
assert.deepEqual(paginationInfo(1, 30, 0), { pages: 1, current: 1, from: 0, to: 0 });
assert.deepEqual(paginationInfo(2, 30, 30), { pages: 1, current: 1, from: 1, to: 30 }, 'last-page deletion clamps to an existing page');
assert.deepEqual(paginationInfo(2, 50, 100), { pages: 2, current: 2, from: 51, to: 100 });
assert.deepEqual(paginationInfo(7, 30, 1284), { pages: 43, current: 7, from: 181, to: 210 });

// The numbered window: first, last, the current page and its neighbours, gaps as null.
assert.deepEqual(pageWindow(1, 1), [1]);
assert.deepEqual(pageWindow(1, 5), [1, 2, null, 5]);
assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
assert.deepEqual(pageWindow(7, 43), [1, null, 6, 7, 8, null, 43]);
assert.deepEqual(pageWindow(43, 43), [1, null, 42, 43]);

// Page and page size live in the URL, so a shared link opens on the same page.
const month = '2026-11';
const link = new URLSearchParams('page=7&limit=100&sort=-amount');
const parsed = parseFilters(link, month);
assert.equal(parsed.page, 7); assert.equal(parsed.limit, 100); assert.equal(parsed.sort, '-amount');
assert.deepEqual([...toParams(parsed, month)].sort(), [['limit', '100'], ['page', '7'], ['sort', '-amount']]);
assert.equal(parseFilters(new URLSearchParams('limit=77&page=-3'), month).limit, null, 'an unsupported page size is ignored');
assert.equal(parseFilters(new URLSearchParams('page=-3'), month).page, 1);
console.log('Passed: 30/50/100/200 page sizes, range arithmetic, empty and clamped results, numbered page window, page/size/sort in the URL.');
