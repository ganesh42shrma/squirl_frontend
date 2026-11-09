import { memo, useState } from 'react';
import { Plus, NotePencil, UsersThree, Sparkle } from '@phosphor-icons/react';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { CategorySelect } from '../categories/CategorySelect';
import { TagInput } from '../tags/TagInput';
import { TagPill } from '../tags/TagPill';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { formatAccount, formatDay, formatMoney, toInputDate } from '../../lib/format';
import { useUpdateTransaction } from './useTransactions';
import { TransactionNoteDialog } from './TransactionNoteDialog';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

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
 * Statement facts stay read-only; personal notes, categories and tags can be edited.
 */
export const LedgerRow = memo(function LedgerRow({ tx, selected, onToggle, isNew, onAddMember }) {
  const [editing, setEditing] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const imported = tx.source === 'import';
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
    if (imported && ['date', 'description', 'amount'].includes(field)) return;
    if (field === 'tags') setDraftTags(tx.tags);
    setEditing(field);
  };

  // A read-only cell that turns into an editor on click, Enter or Space.
  const cellProps = (field) => imported && ['date', 'description', 'amount'].includes(field) ? {} : ({
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
    <>
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
          <span className={imported ? 'ledger-date' : 'editable'} {...cellProps('date')} aria-label={`Date ${formatDay(tx.date)}${imported ? '' : ', edit'}`}>
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
          <span className={`${imported ? 'ledger-statement' : 'editable'} ledger-description`} {...cellProps('description')} title={tx.description}>
            <span className="ledger-description__text">{tx.description}</span>
            <span className="ledger-description__meta">
              {tx.source === 'import' ? `${formatAccount(tx.account)} statement` : formatAccount(tx.account)}
              {tx.notes && <span className="ledger-note-preview"> · {tx.notes}</span>}
            </span>
          </span>
        )}
        <div className="ledger-row-actions">
          <button type="button" className={`ledger-action${tx.notes ? ' has-note' : ''}`} onClick={() => setNoteOpen(true)} aria-label={`${tx.notes ? 'Edit' : 'Add'} note for ${tx.description}`} title={tx.notes ? `Edit note: ${tx.notes}` : 'Add note'}><NotePencil size={16} aria-hidden="true" /></button>
          {onAddMember && <button type="button" className="ledger-action ledger-add-member" onClick={() => onAddMember(tx)} aria-label={`Add to family & friends from ${tx.description}`} title="Add to family & friends"><UsersThree size={16} aria-hidden="true" /></button>}
        </div>
      </div>

      <div className="ledger-cell ledger-cell--category" role="cell">
        {editing === 'category' ? (
          <CategorySelect
            className="cell-input"
            value={tx.category?._id}
            defaultOpen
            placeholder="No category"
            title={`Category for “${tx.description}”`}
            onChange={(id) => save({ category: id })}
            onClose={() => setEditing(null)}
            aria-label="Category"
          />
        ) : (
          <span className="editable" {...cellProps('category')}>
            {label ? (
              <span
                className={`category-chip${tx.autoCategorized ? ' category-chip--auto' : ''}`}
                title={tx.autoCategorized ? `${label}. Sorted automatically; pick a category to confirm or change it` : label}
              >
                <CategoryIcon id={tx.category._id} />
                <span className="category-chip__label">{label}</span>
                {tx.autoCategorized && <span className="category-chip__auto"><Sparkle size={12} weight="fill" aria-hidden="true" />Auto-sorted</span>}
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
        <span className="editable ledger-tags" {...cellProps('tags')} title={tx.tags.join(', ')}>
          {tx.tags.length ? tx.tags.map((tag) => <TagPill key={tag} name={tag} />) : <span className="ledger-tags__add"><Plus size={11} weight="bold" aria-hidden="true" />tag</span>}
        </span>
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
            className={`${imported ? '' : 'editable '}num ledger-amount ${tx.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}
            {...cellProps('amount')}
          >
            {`${tx.type === 'credit' ? '+' : '−'}${formatMoney(tx.amount)}`}
          </span>
        )}
      </div>
    </div>
    {editing === 'tags' && <Dialog title="Transaction tags" onClose={() => setEditing(null)} footer={<><Button variant="quiet" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => save({ tags: draftTags })} disabled={updateTransaction.isPending}>Save tags</Button></>}>
      <TagInput value={draftTags} onChange={setDraftTags} autoFocus />
    </Dialog>}
    {noteOpen && <TransactionNoteDialog transaction={tx} onClose={() => setNoteOpen(false)} />}
    </>
  );
});
