import { useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { CategorySelect } from '../categories/CategorySelect';
import { TagInput } from '../tags/TagInput';
import { describeError } from '../../api/client';
import { isGuestMode, maskFinancialText } from '../../lib/guestMode';
import { formatAccount, toInputDate } from '../../lib/format';
import { AttachmentsPanel } from '../media/AttachmentsPanel';
import { useUpdateTransaction } from './useTransactions';

/**
 * Bottom-sheet editor for one ledger row (the phone's replacement for click-to-edit cells).
 * Same rules as the desktop row: imported statement rows keep date, description and amount read-only.
 */
export function TransactionSheet({ tx, onClose }) {
  const readOnly = tx.source === 'import' || isGuestMode();
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.amount));
  const [type, setType] = useState(tx.type);
  const [date, setDate] = useState(toInputDate(tx.date));
  const [category, setCategory] = useState(tx.category?._id || null);
  const [tags, setTags] = useState(tx.tags);
  const [notes, setNotes] = useState(tx.notes || '');
  const update = useUpdateTransaction();
  const [error, setError] = useState('');

  const save = (e) => {
    e.preventDefault();
    const patch = {};
    if (!readOnly) {
      const nextAmount = Number(amount);
      if (!description.trim() || !nextAmount) {
        setError('A row needs a description and an amount.');
        return;
      }
      if (description.trim() !== tx.description) patch.description = description.trim();
      if (nextAmount !== tx.amount) patch.amount = nextAmount;
      if (type !== tx.type) patch.type = type;
      if (date && date !== toInputDate(tx.date)) patch.date = date;
    }
    if (category !== (tx.category?._id || null)) patch.category = category;
    if (tags.join('\n') !== tx.tags.join('\n')) patch.tags = tags;
    if (!isGuestMode() && notes.trim() !== (tx.notes || '')) patch.notes = notes.trim();
    if (!Object.keys(patch).length) { onClose(); return; }
    setError('');
    update.mutate({ id: tx._id, ...patch }, {
      onSuccess: onClose,
      onError: (err) => setError(describeError(err)),
    });
  };

  return (
    <BottomSheet
      title="Edit row"
      onClose={onClose}
      footer={<>
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="tx-sheet-form" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
      </>}
    >
      <form id="tx-sheet-form" className="tx-form" onSubmit={save}>
        {error && <p className="tx-form__error" role="alert">{error}</p>}
        {tx.source === 'import' && <p className="tx-form__hint">From a bank statement ({formatAccount(tx.account)}). You can sort and tag it; the statement facts stay as they were.</p>}

        <div className="tx-form__amount">
          <button
            type="button"
            className={`sign-toggle sign-toggle--${type}`}
            disabled={readOnly}
            onClick={() => setType((t) => (t === 'debit' ? 'credit' : 'debit'))}
            aria-label={type === 'debit' ? 'Money out. Switch to money in' : 'Money in. Switch to money out'}
          >
            {type === 'debit' ? <Minus weight="bold" aria-hidden="true" /> : <Plus weight="bold" aria-hidden="true" />}
          </button>
          <input
            className="tx-form__amount-input num"
            inputMode="decimal"
            value={isGuestMode() ? '••••' : amount}
            readOnly={readOnly}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            aria-label="Amount in rupees"
          />
        </div>

        <label className="field">
          <span>Description</span>
          <input className="input tx-form__input" value={isGuestMode() ? maskFinancialText(description) : description} readOnly={readOnly} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" className="input tx-form__input num" value={date} readOnly={readOnly} disabled={readOnly} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field">
          <span>Category</span>
          <CategorySelect className="tx-form__picker" value={category} onChange={setCategory} placeholder="Pick a category" title="Category" aria-label="Category" />
        </div>
        <div className="field">
          <span>Tags</span>
          <TagInput value={tags} onChange={setTags} />
        </div>
        {!isGuestMode() && (
          <label className="field">
            <span>Note</span>
            <textarea className="input tx-form__input tx-form__note" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </label>
        )}
        <AttachmentsPanel ownerType="transaction" ownerId={tx._id} />
      </form>
    </BottomSheet>
  );
}
