import { useState } from 'react';
import { CaretLeft, CaretRight, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';
import { LEDGER_PAGE_SIZES, paginationInfo } from './ledgerPaging';
import { pageWindow } from './ledgerFilters';

/** "Showing 61–90 of 1,284", first / previous / numbered pages / next / last, page size, and jump-to-page. */
export function LedgerPagination({ page, limit, total, loading, onPage, onLimit }) {
  const { current, pages, from, to } = paginationInfo(page, limit, total);
  const [jump, setJump] = useState('');
  const go = (e) => {
    e.preventDefault();
    const n = Math.floor(Number(jump));
    if (n >= 1 && n <= pages) { onPage(n); setJump(''); }
  };
  return <nav className="ledger-pagination" aria-label="Transaction pages">
    <p className="ledger-pagination__count" role="status">{loading ? 'Loading…' : total ? `Showing ${from.toLocaleString('en-IN')}–${to.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')}` : 'No rows'}</p>
    <label className="ledger-pagination__size">Rows
      <select className="select" value={limit} onChange={(event) => onLimit(Number(event.target.value))} disabled={loading} aria-label="Rows per page">
        {LEDGER_PAGE_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
      </select>
    </label>
    <div className="ledger-pagination__pages">
      <button type="button" onClick={() => onPage(1)} disabled={loading || current === 1} aria-label="First page" title="First page"><CaretDoubleLeft size={16} /></button>
      <button type="button" onClick={() => onPage(current - 1)} disabled={loading || current === 1} aria-label="Previous page" title="Previous page"><CaretLeft size={16} /></button>
      <ol className="ledger-pagination__numbers">
        {pageWindow(current, pages).map((n, i) => (n === null
          ? <li key={`gap-${i}`} aria-hidden="true" className="ledger-pagination__gap">…</li>
          : <li key={n}><button type="button" className={n === current ? 'is-current' : ''} aria-label={`Page ${n}`} aria-current={n === current ? 'page' : undefined} disabled={loading} onClick={() => onPage(n)}>{n}</button></li>))}
      </ol>
      <button type="button" onClick={() => onPage(current + 1)} disabled={loading || current === pages} aria-label="Next page" title="Next page"><CaretRight size={16} /></button>
      <button type="button" onClick={() => onPage(pages)} disabled={loading || current === pages} aria-label="Last page" title="Last page"><CaretDoubleRight size={16} /></button>
    </div>
    {pages > 10 && (
      <form className="ledger-pagination__jump" onSubmit={go}>
        <label className="visually-hidden" htmlFor="ledger-jump">Go to page</label>
        <input id="ledger-jump" className="input" type="number" min={1} max={pages} value={jump} onChange={(e) => setJump(e.target.value)} placeholder="Go to page" />
        <button type="submit" className="btn btn--quiet btn--small" disabled={!jump}>Go</button>
      </form>
    )}
  </nav>;
}
