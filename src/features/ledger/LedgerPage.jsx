import { isGuestMode } from '../../lib/guestMode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { MonthSwitcher } from '../../components/ui/MonthSwitcher';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { currentMonthKey, formatMoney } from '../../lib/format';
import { financePath } from '../../app/paths';
import { useSummary, useTransactions } from './useTransactions';
import { MonthTotals } from './MonthTotals';
import { AddRow } from './AddRow';
import { LedgerRow } from './LedgerRow';
import { BulkBar } from './BulkBar';
import { LedgerFilters, rangeTitle } from './FilterBar';
import { LedgerPagination } from './LedgerPagination';
import { paginationInfo, rememberPageSize, rememberedPageSize } from './ledgerPaging';
import { activeFilterCount, clearedFilters, parseFilters, rangeFor, toParams, toQuery, toSummaryQuery } from './ledgerFilters';
import { AddMemberDialog } from '../profile/AddMemberDialog';
import { PaymentNotePrompt } from './PaymentNotePrompt';
import './ledger.css';

const NEXT_SORT = { '-date': 'date', date: '-date', '-amount': 'amount', amount: '-amount' };
const money = (n) => formatMoney(Math.round(n), { rounded: true });

function SortButton({ field, sort, onSort, children }) {
  const active = sort.replace('-', '') === field;
  const desc = sort.startsWith('-');
  return (
    <button
      type="button"
      className={`ledger-sort${active ? ' is-active' : ''}`}
      onClick={() => onSort(active ? NEXT_SORT[sort] : `-${field}`)}
      aria-label={`Sort by ${field}${active ? (desc ? ', currently newest or largest first' : ', currently oldest or smallest first') : ''}`}
    >
      {children}
      {active && (desc ? <ArrowDown size={12} weight="bold" aria-hidden="true" /> : <ArrowUp size={12} weight="bold" aria-hidden="true" />)}
    </button>
  );
}

export function LedgerPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const paymentPrompt = params.get('payment');
  const closePaymentPrompt = () => {
    const next = new URLSearchParams(params); next.delete('payment');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const refresh = (event) => {
      if (!['squirl:payment-recorded', 'squirl:payment-note-saved'].includes(event.data?.type)) return;
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['payment-prompt'] });
    };
    navigator.serviceWorker?.addEventListener('message', refresh);
    return () => navigator.serviceWorker?.removeEventListener('message', refresh);
  }, [queryClient]);
  const currentMonth = currentMonthKey();
  const filters = useMemo(() => parseFilters(params, currentMonth), [params, currentMonth]);
  const limit = filters.limit ?? rememberedPageSize();
  const page = filters.page;
  const range = rangeFor(filters, currentMonth);
  const title = rangeTitle(filters);
  const filtered = activeFilterCount(filters) > 0;

  // Filters, sort, page and page size all live in the URL, so links share, Back works and refresh keeps
  // the view. Anything but the page itself sends you back to page 1.
  const update = useCallback((patch, { replace = false } = {}) => {
    setParams(toParams({ ...filters, page: 1, ...patch }, currentMonth), { replace });
  }, [filters, currentMonth, setParams]);
  const changePage = (next) => update({ page: next });
  const changeLimit = (next) => { rememberPageSize(next); update({ limit: next }); };
  const clearFilters = () => update(clearedFilters(filters));

  const [selected, setSelected] = useState(() => new Set());
  const [newId, setNewId] = useState(null);
  const [memberTransaction, setMemberTransaction] = useState(null);
  const tableTop = useRef(null);

  const query = useMemo(() => toQuery(filters, currentMonth, limit), [filters, currentMonth, limit]);
  const scope = JSON.stringify({ ...query, page: 0 });
  const { data, isLoading, isError, error, isFetching, isPlaceholderData } = useTransactions(query);
  // Totals for exactly the rows these filters match (only when something is filtered; the sentence above covers the month).
  const summary = useSummary(toSummaryQuery(filters, currentMonth), { enabled: filtered });
  const rows = useMemo(() => isPlaceholderData || isError ? [] : data?.data || [], [data, isPlaceholderData, isError]);
  const total = data?.meta?.total || 0;
  const { pages } = paginationInfo(page, limit, total);
  const changingPage = !isError && (isLoading || isPlaceholderData || page > pages);
  // A deletion or a background category change can remove the last page.
  useEffect(() => {
    if (!isFetching && !isError && data && !isPlaceholderData && page > pages) update({ page: pages }, { replace: true });
  }, [data, isFetching, isError, isPlaceholderData, page, pages, update]);

  // Selection belongs to the current page and query scope.
  useEffect(() => setSelected(new Set()), [scope, page]);
  // Paging scrolls the table back into view.
  const firstPage = useRef(page);
  useEffect(() => {
    if (firstPage.current === page) return;
    firstPage.current = page;
    tableTop.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [page]);

  useEffect(() => {
    if (!newId) return;
    const id = setTimeout(() => setNewId(null), 1800);
    return () => clearTimeout(id);
  }, [newId]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r._id)));

  const totals = summary.data?.totals;
  const resultText = filtered && !isError
    ? `${total.toLocaleString('en-IN')} row${total === 1 ? '' : 's'}${totals ? ` · Out ${money(totals.debit)} · In ${money(totals.credit)}` : ''}`
    : '';

  return (
    <div className="ledger">
      {paymentPrompt && <PaymentNotePrompt id={paymentPrompt} onClose={closePaymentPrompt} />}
      <header className="ledger__head">
        {filters.preset === 'month' ? (
          <MonthSwitcher month={filters.month} onChange={(month) => update({ preset: 'month', month })} />
        ) : (
          <div className="import-view">
            <h1 className="month-switcher__label">{title}</h1>
            {filters.importId && <p>Rows from one statement. Select rows and use the bar at the bottom to sort several at once.</p>}
          </div>
        )}
        {filtered ? (
          <p className="month-totals">
            {resultText || 'Counting…'}
          </p>
        ) : (
          <MonthTotals from={range.from} to={range.to} />
        )}
      </header>

      <LedgerFilters filters={filters} onChange={update} onClear={clearFilters} resultText={filtered ? resultText : ''} />

      <div className="ledger-table-scroll" ref={tableTop}>
        <div className={`ledger-table${isFetching && !isLoading ? ' is-refreshing' : ''}`} role="table" aria-label="Transactions" aria-busy={isFetching}>
          <div className="ledger-row ledger-row--head" role="row">
            <div className="ledger-cell ledger-cell--check" role="columnheader">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all rows on this page" disabled={!rows.length || isFetching} />
            </div>
            <div className="ledger-cell ledger-cell--date" role="columnheader">
              <SortButton field="date" sort={filters.sort} onSort={(sort) => update({ sort })}>Date</SortButton>
            </div>
            <div className="ledger-cell ledger-cell--description" role="columnheader">Description</div>
            <div className="ledger-cell ledger-cell--category" role="columnheader">Category</div>
            <div className="ledger-cell ledger-cell--tags" role="columnheader">Tags</div>
            <div className="ledger-cell ledger-cell--amount" role="columnheader">
              <SortButton field="amount" sort={filters.sort} onSort={(sort) => update({ sort })}>Amount</SortButton>
            </div>
          </div>

          {filters.preset === 'month' && !filtered && !isGuestMode() && <AddRow onAdded={(created) => { changePage(1); setNewId(created._id); }} />}

          {changingPage &&
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="ledger-row ledger-row--skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ))}

          {isError && (
            <div className="ledger-message" role="alert">
              <p className="ledger-message__title">The ledger couldn’t load.</p>
              <p>{error.message}</p>
            </div>
          )}

          {!changingPage && !isError && rows.length === 0 && (
            <div className="ledger-message">
              <EmptyJar />
              {filtered ? (
                <>
                  <p className="ledger-message__title">Nothing matches these filters.</p>
                  <button type="button" className="link-button" onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <p className="ledger-message__title">Nothing logged for {title.toLowerCase() === 'this month' ? 'this month' : title} yet.</p>
                  <p>
                    {filters.preset === 'month' ? 'Add your first row above, or ' : 'Try another date range, or '}<Link to={financePath('imports')}>bring in a bank statement</Link>.
                  </p>
                </>
              )}
            </div>
          )}

          {rows.map((tx) => (
            <LedgerRow key={tx._id} tx={tx} selected={selected.has(tx._id)} onToggle={toggle} isNew={tx._id === newId} onAddMember={setMemberTransaction} />
          ))}
        </div>

      </div>
      <LedgerPagination page={page} limit={limit} total={total} loading={isFetching || changingPage} onPage={changePage} onLimit={changeLimit} />

      <BulkBar ids={[...selected]} onClear={() => setSelected(new Set())} />
      {memberTransaction && <AddMemberDialog transaction={memberTransaction} onClose={() => setMemberTransaction(null)} />}
    </div>
  );
}
