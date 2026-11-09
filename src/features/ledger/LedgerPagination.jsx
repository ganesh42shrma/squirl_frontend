import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';
import { LEDGER_PAGE_SIZES, paginationInfo } from './ledgerPaging';

export function LedgerPagination({ page, limit, total, loading, onPage, onLimit }) {
  const { current, pages, from, to } = paginationInfo(page, limit, total);
  return <nav className="ledger-pagination" aria-label="Transaction pages">
    <p className="ledger-pagination__count" role="status">{loading ? 'Loading…' : `${from}–${to} of ${total}`}</p>
    <label className="ledger-pagination__size">Rows
      <select className="select" value={limit} onChange={(event) => onLimit(Number(event.target.value))} disabled={loading} aria-label="Rows per page">
        {LEDGER_PAGE_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
      </select>
    </label>
    <div className="ledger-pagination__pages">
      <button type="button" onClick={() => onPage(1)} disabled={loading || current === 1} aria-label="First page" title="First page"><CaretDoubleLeft size={16} /></button>
      <button type="button" onClick={() => onPage(current - 1)} disabled={loading || current === 1} aria-label="Previous page" title="Previous page"><CaretLeft size={16} /></button>
      <span>Page {current} of {pages}</span>
      <button type="button" onClick={() => onPage(current + 1)} disabled={loading || current === pages} aria-label="Next page" title="Next page"><CaretRight size={16} /></button>
      <button type="button" onClick={() => onPage(pages)} disabled={loading || current === pages} aria-label="Last page" title="Last page"><CaretDoubleRight size={16} /></button>
    </div>
  </nav>;
}
