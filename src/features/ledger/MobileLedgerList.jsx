import { memo } from 'react';
import { Plus } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { TagPill } from '../tags/TagPill';
import { maskFinancialText } from '../../lib/guestMode';
import { formatAccount, formatMoney, todayISO, toInputDate } from '../../lib/format';

function categoryLabel(category) {
  if (!category) return null;
  return category.parent ? `${category.parent.name} › ${category.name}` : category.name;
}

// "Today", "Yesterday", else "Wed, 14 Oct".
function dayHeading(iso) {
  const today = Date.parse(todayISO());
  const diff = Math.round((today - Date.parse(iso)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Consecutive rows on the same day share a heading, so any sort order stays truthful.
function groupByDay(rows) {
  const groups = [];
  rows.forEach((tx) => {
    const key = toInputDate(tx.date);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(tx);
    else groups.push({ key, id: `${key}-${tx._id}`, rows: [tx] });
  });
  return groups;
}

const TxCard = memo(function TxCard({ tx, isNew, onOpen }) {
  const label = categoryLabel(tx.category);
  const credit = tx.type === 'credit';
  return (
    <li>
      <button type="button" className={`tx-card${isNew ? ' is-new' : ''}`} onClick={() => onOpen(tx)}>
        <span className="tx-card__icon" aria-hidden="true">
          {tx.category ? <CategoryIcon id={tx.category._id} size={22} /> : <Plus size={18} weight="bold" />}
        </span>
        <span className="tx-card__main">
          <span className="tx-card__title">{maskFinancialText(tx.description)}</span>
          <span className="tx-card__meta">
            <span className={tx.category ? '' : 'tx-card__unsorted'}>{label || 'Sort it'}</span>
            <span aria-hidden="true"> · </span>
            {formatAccount(tx.account)}
          </span>
          {tx.tags.length > 0 && (
            <span className="tx-card__tags">
              {tx.tags.map((tag) => <TagPill key={tag} name={tag} />)}
            </span>
          )}
        </span>
        <span className={`tx-card__amount num ${credit ? 'amount-credit' : 'amount-debit'}`}>
          {`${credit ? '+' : '−'}${formatMoney(tx.amount)}`}
        </span>
      </button>
    </li>
  );
});

/** The phone version of the ledger table: day-grouped cards; tap one to edit it in a sheet. */
export function MobileLedgerList({ rows, newId, onOpen }) {
  return (
    <div className="tx-list">
      {groupByDay(rows).map((group) => (
        <section key={group.id} className="tx-day" aria-label={dayHeading(group.key)}>
          <h2 className="tx-day__heading">{dayHeading(group.key)}</h2>
          <ul className="tx-day__rows">
            {group.rows.map((tx) => <TxCard key={tx._id} tx={tx} isNew={tx._id === newId} onOpen={onOpen} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}
