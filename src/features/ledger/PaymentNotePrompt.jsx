import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { api, describeError } from '../../api/client';
import { formatAccount, formatDay, formatMoney } from '../../lib/format';
import { useGuestMode } from '../../lib/useGuestMode';

function NoteForm({ id, onClose }) {
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const payment = useQuery({ queryKey: ['payment-prompt', id], queryFn: () => api(`/notifications/payments/${id}`).then((r) => r.data), retry: false });
  const save = useMutation({
    mutationFn: () => api(`/notifications/payments/${id}/reply`, { method: 'POST', body: { note: note.trim() } }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['transactions'] });
      client.invalidateQueries({ queryKey: ['payment-prompt', id] });
      onClose();
    },
  });
  const tx = payment.data?.transaction;
  const answered = Boolean(payment.data?.answeredAt);
  return <Dialog title="What was this for?" onClose={onClose} footer={<>
    <Button variant="quiet" onClick={onClose}>{answered ? 'Close' : 'Later'}</Button>
    {tx && !answered && <Button type="submit" form="payment-purpose-form" disabled={save.isPending || !note.trim()}>{save.isPending ? 'Saving…' : 'Save note'}</Button>}
  </>}>
    {payment.isPending && <p role="status">Loading payment…</p>}
    {payment.isError && <p role="alert">{describeError(payment.error)}</p>}
    {tx && <form id="payment-purpose-form" className="transaction-note-form" onSubmit={(event) => { event.preventDefault(); if (note.trim()) save.mutate(); }}>
      <div className="transaction-note-source"><p>{tx.description}</p><span>{formatDay(tx.date)} · {formatAccount(tx.account)} · {tx.type === 'debit' ? 'Paid' : 'Received'} {formatMoney(tx.amount)}</span></div>
      {tx.notes && <p className="cm-hint">Current note: {tx.notes}</p>}
      {answered ? <p role="status">A note has already been added. You can edit it from the ledger.</p> : <>
        <label className="field" htmlFor="payment-purpose"><span>What was this payment for?</span>
          <textarea id="payment-purpose" className="input transaction-note-input" rows={3} maxLength={500} autoFocus value={note} onChange={(event) => setNote(event.target.value)} placeholder="Lunch, groceries, paid back a friend…" required />
        </label>
        <p className="cm-hint">Saved in this payment’s notes. Its bank narration stays unchanged.</p>
      </>}
      {save.isError && <p className="import-error" role="alert">{describeError(save.error)}</p>}
    </form>}
  </Dialog>;
}

export function PaymentNotePrompt({ id, onClose }) {
  const { guestMode } = useGuestMode();
  if (guestMode) return <Dialog title="Payment note" onClose={onClose}><p>Turn off guest mode to view this payment and add a note.</p></Dialog>;
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  return <NoteForm key={id} id={id} onClose={onClose} />;
}
