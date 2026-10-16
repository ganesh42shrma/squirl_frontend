import { useRef, useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { CategorySelect } from '../categories/CategorySelect';
import { TagInput } from '../tags/TagInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { todayISO } from '../../lib/format';
import { useCreateTransaction } from './useTransactions';

const EMPTY = { description: '', amount: '', category: null, tags: [] };

/**
 * The always-open first row of the ledger. Type, press Enter, keep going:
 * after saving, the date stays and focus jumps back to the description.
 */
export function AddRow({ onAdded }) {
  const [date, setDate] = useState(todayISO);
  const [type, setType] = useState('debit');
  const [row, setRow] = useState(EMPTY);
  const descriptionRef = useRef(null);
  const createTransaction = useCreateTransaction();
  const toast = useToast();

  const set = (field) => (value) => setRow((r) => ({ ...r, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!row.description.trim() || !Number(row.amount)) {
      descriptionRef.current?.focus();
      toast('Add a description and an amount to save the row.', { tone: 'error' });
      return;
    }

    createTransaction.mutate(
      {
        date,
        type,
        description: row.description.trim(),
        amount: Number(row.amount),
        category: row.category || undefined,
        tags: row.tags,
      },
      {
        onSuccess: (created) => {
          setRow(EMPTY);
          setType('debit');
          descriptionRef.current?.focus();
          onAdded?.(created);
        },
        onError: (err) => toast(describeError(err), { tone: 'error' }),
      },
    );
  };

  return (
    <form className="add-row" onSubmit={handleSubmit} aria-label="Add a transaction">
      <input
        type="date"
        className="input add-row__date num"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Date"
        required
      />
      <input
        ref={descriptionRef}
        className="input add-row__description"
        placeholder="What was it?"
        value={row.description}
        onChange={(e) => set('description')(e.target.value)}
        aria-label="Description"
      />
      <CategorySelect
        className="add-row__category"
        value={row.category}
        onChange={set('category')}
        placeholder="Category"
        aria-label="Category"
      />
      <div className="add-row__tags">
        <TagInput value={row.tags} onChange={set('tags')} placeholder="Tags" />
      </div>
      <div className="add-row__amount">
        <button
          type="button"
          className={`sign-toggle sign-toggle--${type}`}
          onClick={() => setType((t) => (t === 'debit' ? 'credit' : 'debit'))}
          aria-label={type === 'debit' ? 'Money out. Switch to money in' : 'Money in. Switch to money out'}
          title={type === 'debit' ? 'Money out' : 'Money in'}
        >
          {type === 'debit' ? <Minus weight="bold" aria-hidden="true" /> : <Plus weight="bold" aria-hidden="true" />}
        </button>
        <input
          className="input num"
          inputMode="decimal"
          placeholder="₹0"
          value={row.amount}
          onChange={(e) => set('amount')(e.target.value.replace(/[^\d.]/g, ''))}
          aria-label="Amount in rupees"
        />
      </div>
      <Button type="submit" variant="primary" className="add-row__submit" disabled={createTransaction.isPending}>
        Add
      </Button>
    </form>
  );
}
