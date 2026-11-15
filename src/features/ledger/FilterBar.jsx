import { useEffect, useMemo, useState } from 'react';
import { CalendarBlank, CurrencyInr, Funnel, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Popover } from '../../components/ui/Popover';
import { CategorySelect } from '../categories/CategorySelect';
import { useCategories } from '../categories/useCategories';
import { useImports } from '../imports/useImports';
import { useBalances } from '../insights/useInsights';
import { useTags } from '../tags/useTags';
import { useDebouncedValue } from '../../lib/hooks';
import { currentMonthKey, formatAccount, formatDate, formatMonth, shiftMonth } from '../../lib/format';
import { SEARCH_SCOPES, amountLabel, buildChips, financialYear } from './ledgerFilters';

// The label on the date button: what the range is, in words.
export function rangeTitle(filters) {
  const current = currentMonthKey();
  switch (filters.preset) {
    case 'month':
      return filters.month === current ? 'This month' : filters.month === shiftMonth(current, -1) ? 'Last month' : formatMonth(filters.month);
    case 'last3': return 'Last 3 months';
    case 'last6': return 'Last 6 months';
    case 'fy': return financialYear(current).label;
    case 'lastfy': return financialYear(current, -1).label;
    case 'all': return 'All time';
    default:
      if (filters.from && filters.to) return `${formatDate(filters.from)} – ${formatDate(filters.to)}`;
      return filters.from ? `From ${formatDate(filters.from)}` : filters.to ? `Until ${formatDate(filters.to)}` : 'Custom range';
  }
}

const DATE_CHOICES = [
  { id: 'this', label: 'This month', patch: () => ({ preset: 'month', month: currentMonthKey() }), is: (f) => f.preset === 'month' && f.month === currentMonthKey() },
  { id: 'last', label: 'Last month', patch: () => ({ preset: 'month', month: shiftMonth(currentMonthKey(), -1) }), is: (f) => f.preset === 'month' && f.month === shiftMonth(currentMonthKey(), -1) },
  { id: 'last3', label: 'Last 3 months', patch: () => ({ preset: 'last3' }), is: (f) => f.preset === 'last3' },
  { id: 'last6', label: 'Last 6 months', patch: () => ({ preset: 'last6' }), is: (f) => f.preset === 'last6' },
  { id: 'fy', label: `This financial year (${financialYear(currentMonthKey()).label.slice(3)})`, patch: () => ({ preset: 'fy' }), is: (f) => f.preset === 'fy' },
  { id: 'lastfy', label: `Last financial year (${financialYear(currentMonthKey(), -1).label.slice(3)})`, patch: () => ({ preset: 'lastfy' }), is: (f) => f.preset === 'lastfy' },
  { id: 'all', label: 'All time', patch: () => ({ preset: 'all' }), is: (f) => f.preset === 'all' },
];

function DatePanel({ filters, onChange, close }) {
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const bad = from && to && from > to;
  return (
    <>
      <fieldset className="filter-radios"><legend>Dates</legend>
        {DATE_CHOICES.map((c) => (
          <label key={c.id} className="check-row"><input type="radio" name="date-preset" checked={c.is(filters)} onChange={() => { onChange(c.patch()); close(); }} /> {c.label}</label>
        ))}
        <label className="check-row"><input type="radio" name="date-preset" checked={filters.preset === 'custom'} onChange={() => onChange({ preset: 'custom', from, to })} /> Custom range</label>
      </fieldset>
      <div className="filter-pair">
        <label className="field">From<input className="input" type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); if (filters.preset === 'custom') onChange({ from: e.target.value }); }} /></label>
        <label className="field">To<input className="input" type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); if (filters.preset === 'custom') onChange({ to: e.target.value }); }} /></label>
      </div>
      {bad && <p className="import-error" role="alert">The start date is after the end date.</p>}
      <button type="button" className="btn btn--accent btn--small" disabled={bad || (!from && !to)} onClick={() => { onChange({ preset: 'custom', from, to }); close(); }}>Use this range</button>
    </>
  );
}

const AMOUNT_QUICK = [
  { label: 'Under ₹500', min: null, max: 500 },
  { label: '₹500 – ₹5,000', min: 500, max: 5000 },
  { label: 'Over ₹5,000', min: 5000, max: null },
];

function AmountPanel({ filters, onChange, close }) {
  const [min, setMin] = useState(filters.min ?? '');
  const [max, setMax] = useState(filters.max ?? '');
  const lo = min === '' ? null : Number(min);
  const hi = max === '' ? null : Number(max);
  const bad = lo !== null && hi !== null && lo > hi;
  const apply = (next) => { onChange({ min: next.min, max: next.max }); close(); };
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!bad) apply({ min: lo, max: hi }); }} className="filter-form">
      <div className="chip-group filter-quick" role="group" aria-label="Quick amounts">
        {AMOUNT_QUICK.map((q) => <button key={q.label} type="button" className="chip" onClick={() => apply(q)}>{q.label}</button>)}
      </div>
      <div className="filter-pair">
        <label className="field">At least<span className="filter-money"><span aria-hidden="true">₹</span><input className="input" type="number" min={0} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} /></span></label>
        <label className="field">At most<span className="filter-money"><span aria-hidden="true">₹</span><input className="input" type="number" min={0} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} /></span></label>
      </div>
      {bad && <p className="import-error" role="alert">The smallest amount is above the largest.</p>}
      <p className="member-hint">Compares the size of the row, whether money came in or went out. Pair it with “Money out” in More filters.</p>
      <div className="filter-actions">
        <button type="button" className="link-button" onClick={() => apply({ min: null, max: null })}>Clear</button>
        <button type="submit" className="btn btn--accent btn--small" disabled={bad || (lo === null && hi === null)}>Apply</button>
      </div>
    </form>
  );
}

function StatementPicker({ value, onChange, imports }) {
  const [term, setTerm] = useState('');
  const shown = imports.filter((b) => b.status === 'completed' && (!term || b.fileName.toLowerCase().includes(term.toLowerCase())));
  return (
    <fieldset className="filter-radios"><legend>Statement</legend>
      {imports.length > 6 && <input className="input" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Find a statement" aria-label="Find a statement" />}
      <div className="filter-list">
        <label className="check-row"><input type="radio" name="statement" checked={!value} onChange={() => onChange('')} /> Any statement</label>
        {shown.map((b) => (
          <label key={b._id} className="check-row"><input type="radio" name="statement" checked={value === b._id} onChange={() => onChange(b._id)} />
            <span>{b.fileName}<span className="member-hint"> · {statementMeta(b)}</span></span>
          </label>
        ))}
        {!shown.length && <p className="member-hint">{imports.length ? 'No statement matches.' : 'No statements imported yet.'}</p>}
      </div>
    </fieldset>
  );
}
export const statementMeta = (b) => [b.bank ? b.bank.toUpperCase() : null, b.periodFrom && b.periodTo ? `${formatDate(b.periodFrom)} – ${formatDate(b.periodTo)}` : null, `${b.stats.inserted} rows`].filter(Boolean).join(' · ');

function MorePanel({ filters, onChange, imports }) {
  const balances = useBalances();
  const accounts = [...new Set([...(balances.data?.accounts || []).map((a) => a.account), filters.account].filter(Boolean))];
  return (
    <div className="filter-form">
      <fieldset className="filter-radios"><legend>Money</legend>
        {[['', 'In and out'], ['debit', 'Money out'], ['credit', 'Money in']].map(([id, label]) => (
          <label key={id} className="check-row"><input type="radio" name="type" checked={filters.type === id} onChange={() => onChange({ type: id })} /> {label}</label>
        ))}
      </fieldset>
      <label className="field">Account
        <select className="select" value={filters.account} onChange={(e) => onChange({ account: e.target.value })}>
          <option value="">All accounts</option>
          {accounts.map((a) => <option key={a} value={a}>{formatAccount(a)}</option>)}
        </select>
      </label>
      <StatementPicker value={filters.importId} onChange={(importId) => onChange({ importId })} imports={imports} />
      <label className="field">Where the row came from
        <select className="select" value={filters.source} onChange={(e) => onChange({ source: e.target.value })}>
          <option value="">Statements and by hand</option><option value="import">From statements</option><option value="manual">Added by hand</option>
        </select>
      </label>
      <label className="check-row"><input type="checkbox" checked={filters.hasNotes} onChange={(e) => onChange({ hasNotes: e.target.checked })} /> Only rows with notes</label>
      <label className="check-row"><input type="checkbox" checked={filters.auto} onChange={(e) => onChange({ auto: e.target.checked })} /> Only rows sorted automatically</label>
    </div>
  );
}

/** The filter bar: search, dates, amount, category, tag, more filters, and the applied chips. */
export function LedgerFilters({ filters, onChange, onClear, resultText }) {
  const [text, setText] = useState(filters.q);
  const debounced = useDebouncedValue(text, 300);
  const { tags } = useTags();
  const { labelOf } = useCategories();
  const imports = useImports();
  // Typing updates the URL (replacing, so Back isn't flooded); an outside change (a chip's ✕) updates the box.
  useEffect(() => { if (debounced !== filters.q) onChange({ q: debounced }, { replace: true }); }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setText(filters.q), [filters.q]);

  const names = useMemo(() => ({
    category: (id) => labelOf(id),
    statement: (id) => imports.data?.find((b) => b._id === id)?.fileName,
    account: formatAccount,
  }), [labelOf, imports.data]);
  const chips = buildChips(filters, names);
  const moreActive = ['type', 'account', 'source', 'importId'].filter((k) => filters[k]).length + (filters.hasNotes ? 1 : 0) + (filters.auto ? 1 : 0);
  const amountActive = filters.min !== null || filters.max !== null;

  return (
    <div className="ledger-filters">
      <div className="ledger__filters" role="search">
        <div className="ledger-search">
          <MagnifyingGlass size={16} aria-hidden="true" className="ledger-search__icon" />
          <input className="input ledger__search" type="search" placeholder="Search the ledger" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search" />
          <label className="visually-hidden" htmlFor="search-in">Search in</label>
          <select id="search-in" className="select ledger-search__scope" value={filters.searchIn} onChange={(e) => onChange({ searchIn: e.target.value })} aria-label="Search in">
            {SEARCH_SCOPES.map((s) => <option key={s.id} value={s.id}>In: {s.label}</option>)}
          </select>
        </div>
        <Popover label={rangeTitle(filters)} icon={<CalendarBlank size={16} aria-hidden="true" />} active={filters.preset !== 'month' || filters.month !== currentMonthKey()}>
          {(close) => <DatePanel filters={filters} onChange={onChange} close={close} />}
        </Popover>
        <Popover label={amountActive ? amountLabel(filters.min, filters.max) : 'Amount'} icon={<CurrencyInr size={16} aria-hidden="true" />} active={amountActive}>
          {(close) => <AmountPanel key={`${filters.min}-${filters.max}`} filters={filters} onChange={onChange} close={close} />}
        </Popover>
        <CategorySelect className="ledger__filter" value={filters.category || null} onChange={(category) => onChange({ category: category || '' })} placeholder="All categories" clearLabel="All categories" allowNone title="Show rows in a category" aria-label="Filter by category" />
        <select className="select ledger__filter" value={filters.tag} onChange={(e) => onChange({ tag: e.target.value })} aria-label="Filter by tag">
          <option value="">All tags</option>
          {tags.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <Popover label="More filters" icon={<Funnel size={16} aria-hidden="true" />} badge={moreActive || null} active={moreActive > 0} align="right">
          <MorePanel filters={filters} onChange={onChange} imports={imports.data || []} />
        </Popover>
      </div>
      {(chips.length > 0 || resultText) && (
        <div className="ledger-applied">
          {chips.length > 0 && (
            <ul className="ledger-chips" aria-label="Applied filters">
              {chips.map((c) => (
                <li key={c.id} className="filter-chip">
                  <span><span className="filter-chip__name">{c.name}:</span> {c.value}</span>
                  <button type="button" aria-label={`Remove filter: ${c.name} ${c.value}`} onClick={() => onChange(c.patch)}><X size={12} weight="bold" aria-hidden="true" /></button>
                </li>
              ))}
              {chips.length > 1 && <li><button type="button" className="link-button" onClick={onClear}>Clear all</button></li>}
            </ul>
          )}
          <p className="ledger-applied__count" role="status" aria-live="polite">{resultText}</p>
        </div>
      )}
    </div>
  );
}
