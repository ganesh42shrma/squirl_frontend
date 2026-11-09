import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { describeError } from '../../api/client';
import { formatDay, formatMoney } from '../../lib/format';
import { useUpdateTransaction } from './useTransactions';

export function TransactionNoteDialog({ transaction, onClose }) {
  const [notes, setNotes] = useState(transaction.notes || '');
  const update = useUpdateTransaction();
  const save = (value) => update.mutate({ id: transaction._id, notes: value.trim() }, { onSuccess: onClose });
  return <Dialog title="Transaction note" onClose={onClose} footer={<>
    {transaction.notes && <Button variant="quiet" className="transaction-note-remove" disabled={update.isPending} onClick={() => save('')}>Remove note</Button>}
    <Button variant="quiet" onClick={onClose}>Cancel</Button>
    <Button type="submit" form="transaction-note-form" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save note'}</Button>
  </>}>
    <form id="transaction-note-form" className="transaction-note-form" onSubmit={(event) => { event.preventDefault(); save(notes); }}>
      <div className="transaction-note-source"><p>{transaction.description}</p><span>{formatDay(transaction.date)} · {formatMoney(transaction.amount)}</span></div>
      <label className="field" htmlFor="transaction-note"><span>Note <span className="transaction-note-optional">Optional</span></span>
        <textarea id="transaction-note" className="input transaction-note-input" rows={4} maxLength={1000} autoFocus value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What would you like to remember?" />
      </label>
      {update.isError && <p className="import-error" role="alert">{describeError(update.error)}</p>}
    </form>
  </Dialog>;
}
