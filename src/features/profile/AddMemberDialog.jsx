import { useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useAddFamilyMember } from '../auth/useAuth';
import { MemberFields, memberDraft, memberBody } from './MemberFields';
import './profile.css';

export function AddMemberDialog({ transaction, onClose }) {
  const [form, setForm] = useState(() => memberDraft(transaction.memberCandidate));
  const save = useAddFamilyMember();
  const toast = useToast();
  return (
    <Dialog title="Add member" onClose={onClose} footer={
      <>
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="ledger-member-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save member'}</Button>
      </>
    }>
      <form id="ledger-member-form" className="profile-form" onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ transactionId: transaction._id, ...memberBody(form) }, { onSuccess: () => {
          toast('Member saved. Updating matching past payments…');
          onClose();
        } });
      }}>
        <p className="member-source" title={transaction.description}>{transaction.description}</p>
        <MemberFields value={form} onChange={setForm} />
        <p className="member-hint">This payment and matching past payments move to Family.</p>
        {save.isError && <p className="import-error">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}
