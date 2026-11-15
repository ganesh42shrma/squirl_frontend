import { useRef, useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { CategorySelect } from '../categories/CategorySelect';
import { TagInput } from '../tags/TagInput';
import { describeError } from '../../api/client';
import { todayISO } from '../../lib/format';
import { useCreateTransaction } from './useTransactions';

/**
 * Full-screen "add a transaction" for phones. Same payload as the desktop AddRow: the amount is
 * typed in rupees (the API takes rupees) and `type` carries the direction.
 */
export function AddTransactionSheet({ onClose, onAdded }) {
  const [type, setType] = useState('debit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayISO);
  const [category, setCategory] = useState(null);
  const [tags, setTags] = useState([]);
  const amountRef = useRef(null);
  const createTransaction = useCreateTransaction();
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!Number(amount)) { amountRef.current?.focus(); setError('Enter an amount to save the row.'); return; }
    if (!description.trim()) { setError('Add a description to save the row.'); return; }
    setError('');
    createTransaction.mutate(
      { date, type, description: description.trim(), amount: Number(amount), category: category || undefined, tags },
      {
        onSuccess: (created) => { onAdded?.(created); onClose(); },
        onError: (err) => setError(describeError(err)),
      },
    );
  };

  return (
    <BottomSheet
      full
      title="Add a transaction"
      onClose={onClose}
      footer={<Button type="submit" form="add-tx-form" disabled={createTransaction.isPending}>{createTransaction.isPending ? 'Saving…' : 'Save'}</Button>}
    >
      <form id="add-tx-form" className="tx-form" onSubmit={submit}>
        {error && <p className="tx-form__error" role="alert">{error}</p>}
        <div className="tx-form__seg" role="group" aria-label="Direction">
          <button type="button" className={type === 'debit' ? 'is-active is-debit' : ''} aria-pressed={type === 'debit'} onClick={() => setType('debit')}>
            <Minus weight="bold" aria-hidden="true" /> Money out
          </button>
          <button type="button" className={type === 'credit' ? 'is-active is-credit' : ''} aria-pressed={type === 'credit'} onClick={() => setType('credit')}>
            <Plus weight="bold" aria-hidden="true" /> Money in
          </button>
        </div>

        <label className={`tx-form__big ${type === 'credit' ? 'amount-credit' : 'amount-debit'}`}>
          <span aria-hidden="true">₹</span>
          <input
            ref={amountRef}
            className="num"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            aria-label="Amount in rupees"
          />
        </label>

        <label className="field">
          <span>Description</span>
          <input className="input tx-form__input" placeholder="What was it?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="field">
          <span>Category</span>
          <CategorySelect className="tx-form__picker" value={category} onChange={setCategory} placeholder="Pick a category" title="Category" aria-label="Category" />
        </div>
        <label className="field">
          <span>Date</span>
          <input type="date" className="input tx-form__input num" value={date} required onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field">
          <span>Tags</span>
          <TagInput value={tags} onChange={setTags} />
        </div>
      </form>
    </BottomSheet>
  );
}
