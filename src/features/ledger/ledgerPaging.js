export const LEDGER_PAGE_SIZES = [30, 50, 100, 200];
export const initialPagination = { scope: '', page: 1, limit: 30 };

export function paginationReducer(state, action) {
  switch (action.type) {
    case 'scope': return state.scope === action.scope ? state : { ...state, scope: action.scope, page: 1 };
    case 'page': return { ...state, scope: action.scope, page: Math.max(1, action.page) };
    case 'limit': return LEDGER_PAGE_SIZES.includes(action.limit) ? { ...state, scope: action.scope, page: 1, limit: action.limit } : state;
    default: return state;
  }
}

export function paginationInfo(page, limit, total) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(page, pages);
  return { pages, current, from: total ? (current - 1) * limit + 1 : 0, to: Math.min(current * limit, total) };
}
