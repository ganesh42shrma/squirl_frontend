// Page sizes and the "61–90 of 1,284" arithmetic. The current page and size live in the URL
// (see ledgerFilters.js); this is only the maths.
export const LEDGER_PAGE_SIZES = [30, 50, 100, 200];
export const DEFAULT_PAGE_SIZE = 30;
const SIZE_KEY = 'squirl-ledger-page-size';

// The size you last picked, remembered in this browser; a link's own ?limit= wins.
export function rememberedPageSize() {
  try {
    const stored = Number(globalThis.localStorage?.getItem(SIZE_KEY));
    return LEDGER_PAGE_SIZES.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}
export function rememberPageSize(size) {
  try { globalThis.localStorage?.setItem(SIZE_KEY, String(size)); } catch { /* blocked storage: it just isn't remembered */ }
}

export function paginationInfo(page, limit, total) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return { pages, current, from: total ? (current - 1) * limit + 1 : 0, to: Math.min(current * limit, total) };
}
