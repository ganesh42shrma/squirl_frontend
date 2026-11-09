import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { MonthSwitcher } from '../../components/ui/MonthSwitcher';
import { CategorySelect } from '../categories/CategorySelect';
import { useTags } from '../tags/useTags';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { useDebouncedValue, useMonthParam } from '../../lib/hooks';
import { monthRange, formatMonth } from '../../lib/format';
import { useTransactions } from './useTransactions';
import { MonthTotals } from './MonthTotals';
import { AddRow } from './AddRow';
import { LedgerRow } from './LedgerRow';
import { BulkBar } from './BulkBar';
import { LedgerPagination } from './LedgerPagination';
import { initialPagination, paginationReducer, paginationInfo } from './ledgerPaging';
import { AddMemberDialog } from '../profile/AddMemberDialog';
import './ledger.css';

const NEXT_SORT = { '-date': 'date', date: '-date', '-amount': 'amount', amount: '-amount' };

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
  const [month, setMonth] = useMonthParam();
  const [params, setParams] = useSearchParams();
  const importId = params.get('importId');
  // Focused views that ignore the month: one import's rows, or every row still waiting for a category.
  const unsortedView = params.get('view') === 'unsorted';
  const autoView = params.get('view') === 'auto';
  const focusedView = importId
    ? { title: 'Rows from one import', scope: { importId } }
    : unsortedView
      ? { title: 'Rows waiting for a category', scope: { category: 'none' } }
      : autoView
        ? { title: 'Rows sorted automatically', scope: { auto: true } }
        : null;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.get('category') || null);
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('-date');
  const [selected, setSelected] = useState(() => new Set());
  const [newId, setNewId] = useState(null);
  const [memberTransaction, setMemberTransaction] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const { tags } = useTags();

  const range = monthRange(month);
  const scope = JSON.stringify([month, importId, unsortedView, autoView, debouncedSearch, category, tag, sort]);
  const [paging, dispatchPage] = useReducer(paginationReducer, initialPagination);
  const page = paging.scope === scope ? paging.page : 1;
  const limit = paging.limit;
  const changePage = (next) => dispatchPage({ type: 'page', scope, page: next });
  useEffect(() => dispatchPage({ type: 'scope', scope }), [scope]);
  const query = {
    search: debouncedSearch,
    category,
    tag,
    sort,
    page,
    limit,
    ...(focusedView ? focusedView.scope : range),
  };
  const { data, isLoading, isError, error, isFetching, isPlaceholderData } = useTransactions(query);
  const rows = useMemo(() => isPlaceholderData || isError ? [] : data?.data || [], [data, isPlaceholderData, isError]);
  const total = data?.meta?.total || 0;
  const filtered = Boolean(debouncedSearch || category || tag);
  const { pages } = paginationInfo(page, limit, total);
  const changingPage = !isError && (isLoading || isPlaceholderData || page > pages);
  // A deletion or background category change can remove the last page.
  useEffect(() => {
    if (!isFetching && !isError && data && !isPlaceholderData && page > pages) dispatchPage({ type: 'page', scope, page: pages });
  }, [data, isFetching, isError, isPlaceholderData, page, pages, scope]);

  // Selection belongs to the current page and query scope.
  useEffect(() => setSelected(new Set()), [scope, page, limit]);

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

  const clearFilters = () => {
    setSearch('');
    setCategory(null);
    setTag('');
  };

  const leaveFocusedView = () =>
    setParams((prev) => {
      const copy = new URLSearchParams(prev);
      ['importId', 'view', 'category'].forEach((key) => copy.delete(key));
      return copy;
    });

  return (
    <div className="ledger">
      <header className="ledger__head">
        {focusedView ? (
          <div className="import-view">
            <h1 className="month-switcher__label">{focusedView.title}</h1>
            <p>
              Select rows and use the bar at the bottom to sort several at once, or{' '}
              <button type="button" className="link-button" onClick={leaveFocusedView}>
                go back to the month view
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <MonthSwitcher month={month} onChange={setMonth} />
            <MonthTotals from={range.from} to={range.to} />
          </>
        )}
      </header>

      <div className="ledger__filters" role="search">
        <input
          className="input ledger__search"
          type="search"
          placeholder="Search descriptions and notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search"
        />
        <CategorySelect
          className="ledger__filter"
          value={category}
          onChange={setCategory}
          placeholder="All categories"
          clearLabel="All categories"
          allowNone
          title="Show rows in a category"
          aria-label="Filter by category"
        />
        <select className="select ledger__filter" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        {filtered && (
          <button type="button" className="link-button" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div className="ledger-table-scroll">
        <div className={`ledger-table${isFetching && !isLoading ? ' is-refreshing' : ''}`} role="table" aria-label="Transactions" aria-busy={isFetching}>
          <div className="ledger-row ledger-row--head" role="row">
            <div className="ledger-cell ledger-cell--check" role="columnheader">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all rows on this page" disabled={!rows.length || isFetching} />
            </div>
            <div className="ledger-cell ledger-cell--date" role="columnheader">
              <SortButton field="date" sort={sort} onSort={setSort}>Date</SortButton>
            </div>
            <div className="ledger-cell ledger-cell--description" role="columnheader">Description</div>
            <div className="ledger-cell ledger-cell--category" role="columnheader">Category</div>
            <div className="ledger-cell ledger-cell--tags" role="columnheader">Tags</div>
            <div className="ledger-cell ledger-cell--amount" role="columnheader">
              <SortButton field="amount" sort={sort} onSort={setSort}>Amount</SortButton>
            </div>
          </div>

          {!focusedView && <AddRow onAdded={(created) => { changePage(1); setNewId(created._id); }} />}

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
                  <p className="ledger-message__title">Nothing logged for {formatMonth(month)} yet.</p>
                  <p>
                    Add your first row above, or <Link to="/app/imports">bring in a bank statement</Link>.
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
      <LedgerPagination page={page} limit={limit} total={total} loading={isFetching || changingPage} onPage={changePage} onLimit={(next) => dispatchPage({ type: 'limit', scope, limit: next })} />

      <BulkBar ids={[...selected]} onClear={() => setSelected(new Set())} />
      {memberTransaction && <AddMemberDialog transaction={memberTransaction} onClose={() => setMemberTransaction(null)} />}
    </div>
  );
}
