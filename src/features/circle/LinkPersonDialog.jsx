import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { maskFinancialText } from '../../lib/guestMode';
import { labelHint, personLabel } from './circleModel';
import { PersonPicker } from './PersonPicker';
import { useLinkPerson } from './useCircle';
import '../profile/profile.css';

/**
 * "Who is this?" for one payment on desktop: pick someone from your circle, or clear it. It only labels the payment
 * (and others from the same UPI id or payee); it never changes a category.
 */
export function LinkPersonDialog({ transaction, onClose, onAddFamily }) {
  const link = useLinkPerson();
  const toast = useToast();
  const person = transaction.person;
  const choose = (personId, message) => link.mutate({ id: transaction._id, personId }, { onSuccess: () => { toast(message); onClose(); } });
  return (
    <Dialog title="Who is this?" onClose={onClose} footer={
      <>
        {onAddFamily && <Button variant="quiet" onClick={() => { onClose(); onAddFamily(transaction); }}>Add as family member…</Button>}
        <Button variant="quiet" onClick={onClose}>Close</Button>
      </>
    }>
      <div className="profile-form">
        <p className="member-source" title={maskFinancialText(transaction.description)}>{maskFinancialText(transaction.description)}</p>
        {person && (
          <div>
            <p><strong>{personLabel(person)}</strong></p>
            <p className="member-hint">{labelHint(person)}</p>
            {person.via === 'link' && <Button variant="quiet" size="small" disabled={link.isPending} onClick={() => choose(null, 'Link removed')}>Remove this link</Button>}
          </div>
        )}
        {transaction.canLinkPerson
          ? <PersonPicker selectedId={person?._id} disabled={link.isPending} onPick={(p) => choose(p._id, `Linked to ${p.name}`)} />
          : <p className="member-hint">This payment has no UPI id or payee name to remember, so it can’t be linked to someone.</p>}
        {link.isError && <p className="import-error" role="alert">{describeError(link.error)}</p>}
      </div>
    </Dialog>
  );
}
