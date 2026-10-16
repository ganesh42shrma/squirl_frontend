import { memo, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { CategorySelect } from '../categories/CategorySelect';
import { TagInput } from '../tags/TagInput';
import { TagPill } from '../tags/TagPill';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatAccount, formatDay, formatMoney, toInputDate } from '../../lib/format';
import { useUpdateTransaction } from './useTransactions';

function categoryLabel(category) {
  if (!category) return null;
  return category.parent ? `${category.parent.name} › ${category.name}` : category.name;
}

// "+500" makes it money in, "-500" money out, plain "500" keeps the current direction.
function parseAmount(raw, currentType) {
  const text = raw.trim();
  const amount = Number(text.replace(/[^\d.]/g, ''));
  if (!amount) return null;
  const type = text.startsWith('+') ? 'credit' : text.startsWith('-') ? 'debit' : currentType;
  return { amount, type };
}

/**
 * One ledger row. Click a cell to edit it in place; Enter or leaving the cell saves, Escape cancels.
 */
export const LedgerRow = memo(function LedgerRow({ tx, selected, onToggle, isNew }) {
  const [editing, setEditing] = useState(null);
  const [draftTags, setDraftTags] = useState(tx.tags);
  const updateTransaction = useUpdateTransaction();
  const toast = useToast();

  const save = (patch) => {
    setEditing(null);
    updateTransaction.mutate(
      { id: tx._id, ...patch },
      { onError: (err) => toast(describeError(err), { tone: 'error' }) },
    );
  };

  const onTextKey = (commit) => (e) => {
    if (e.key === 'Enter') commit(e.currentTarget.value);
    if (e.key === 'Escape') setEditing(null);
  };

  const commitDate = (value) => (value && value !== toInputDate(tx.date) ? save({ date: value }) : setEditing(null));
  const commitDescription = (value) =>
    value.trim() && value.trim() !== tx.description ? save({ description: value.trim() }) : setEditing(null);
  const commitAmount = (value) => {
    const parsed = parseAmount(value, tx.type);
    if (parsed && (parsed.amount !== tx.amount || parsed.type !== tx.type)) save(parsed);
    else setEditing(null);
  };

  const label = categoryLabel(tx.category);

  const startEditing = (field) => {
    if (field === 'tags') setDraftTags(tx.tags);
    setEditing(field);
  };

  // A read-only cell that turns into an editor on click, Enter or Space.
  const cellProps = (field) => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => startEditing(field),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startEditing(field);
      }
    },
  });

  return (
    <div className={`ledger-row${selected ? ' is-selected' : ''}${isNew ? ' is-new' : ''}`} role="row">
      <div className="ledger-cell ledger-cell--check" role="cell">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(tx._id)}
          aria-label={`Select ${tx.description}`}
        />
      </div>

      <div className="ledger-cell ledger-cell--date num" role="cell">
        {editing === 'date' ? (
          <input
            type="date"
            className="input cell-input"
            defaultValue={toInputDate(tx.date)}
            autoFocus
            onBlur={(e) => commitDate(e.target.value)}
            onKeyDown={onTextKey(commitDate)}
            aria-label="Date"
          />
        ) : (
          <span className="editable" {...cellProps('date')} aria-label={`Date ${formatDay(tx.date)}, edit`}>
            {formatDay(tx.date)}
          </span>
        )}
      </div>

      <div className="ledger-cell ledger-cell--description" role="cell">
        {editing === 'description' ? (
          <input
            className="input cell-input"
            defaultValue={tx.description}
            autoFocus
            onBlur={(e) => commitDescription(e.target.value)}
            onKeyDown={onTextKey(commitDescription)}
            aria-label="Description"
          />
        ) : (
          <span className="editable ledger-description" {...cellProps('description')}>
            <span className="ledger-description__text">{tx.description}</span>
            <span className="ledger-description__meta">
              {tx.source === 'import' ? `${formatAccount(tx.account)} statement` : formatAccount(tx.account)}
            </span>
          </span>
        )}
      </div>

      <div className="ledger-cell ledger-cell--category" role="cell">
        {editing === 'category' ? (
          <CategorySelect
            className="cell-input"
            value={tx.category?._id}
            autoFocus
            placeholder="No category"
            onChange={(id) => save({ category: id })}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(null)}
            aria-label="Category"
          />
        ) : (
          <span className="editable" {...cellProps('category')}>
            {label ? (
              <span className="category-chip" title={label}>
                <CategoryIcon id={tx.category._id} />
                <span className="category-chip__label">{label}</span>
              </span>
            ) : (
              <span className="category-chip category-chip--empty">
                <Plus size={11} weight="bold" aria-hidden="true" />
                Sort it
              </span>
            )}
          </span>
        )}
      </div>

      <div className="ledger-cell ledger-cell--tags" role="cell">
        {editing === 'tags' ? (
          <div
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) save({ tags: draftTags });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraftTags(tx.tags);
                setEditing(null);
              }
            }}
          >
            <TagInput value={draftTags} onChange={setDraftTags} autoFocus />
          </div>
        ) : (
          <span className="editable ledger-tags" {...cellProps('tags')}>
            {tx.tags.length ? (
              tx.tags.map((t) => <TagPill key={t} name={t} />)
            ) : (
              <span className="ledger-tags__add">
                <Plus size={11} weight="bold" aria-hidden="true" />
                tag
              </span>
            )}
          </span>
        )}
      </div>

      <div className="ledger-cell ledger-cell--amount" role="cell">
        {editing === 'amount' ? (
          <input
            className="input cell-input num"
            defaultValue={`${tx.type === 'credit' ? '+' : '-'}${tx.amount}`}
            autoFocus
            inputMode="decimal"
            onBlur={(e) => commitAmount(e.target.value)}
            onKeyDown={onTextKey(commitAmount)}
            aria-label="Amount. Start with + for money in or - for money out"
          />
        ) : (
          <span
            className={`editable num ledger-amount ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}
            {...cellProps('amount')}
          >
            {`${tx.type === 'credit' ? '+' : '−'}${formatMoney(tx.amount)}`}
          </span>
        )}
      </div>
    </div>
  );
});
