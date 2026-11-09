import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useUpdateProfile, useFamilySync } from '../auth/useAuth';
import { MemberFields, memberDraft, memberBody } from './MemberFields';

function MemberEditor({ contacts, index, onClose }) {
  const editing = index != null;
  const [form, setForm] = useState(() => memberDraft(editing ? contacts[index] : undefined));
  const save = useUpdateProfile();
  const toast = useToast();
  return (
    <Dialog title={editing ? 'Edit member' : 'Add member'} onClose={onClose} footer={
      <>
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="profile-member-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save member'}</Button>
      </>
    }>
      <form id="profile-member-form" className="profile-form" onSubmit={(e) => {
        e.preventDefault();
        const member = memberBody(form);
        const familyContacts = editing ? contacts.map((c, i) => i === index ? member : c) : [...contacts, member];
        save.mutate({ familyContacts }, { onSuccess: () => { toast('Member saved. Updating past payments…'); onClose(); } });
      }}>
        <MemberFields value={form} onChange={setForm} />
        <p className="member-hint">Matching payments, including already categorized rows, move to Family.</p>
        {save.isError && <p className="import-error">{describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}

export function FamilyContacts({ profile }) {
  const { data: sync } = useFamilySync();
  const contacts = profile.familyContacts || [];
  const [editor, setEditor] = useState(null);
  const remove = useUpdateProfile();
  const toast = useToast();
  return (
    <section className="profile-section" aria-labelledby="family-title">
      <div className="profile-section__head">
        <h2 id="family-title">Family &amp; friends</h2>
        <p>Save your people. Matching payments go to Family.</p>
      </div>
      <div className="member-list-panel">
        <div className="member-list-head">
          <span className="member-hint">{contacts.length} {contacts.length === 1 ? 'member' : 'members'}</span>
          <Button variant="quiet" size="small" disabled={contacts.length >= 200 || remove.isPending} onClick={() => setEditor({ index: null })}>Add member</Button>
        </div>
        {!contacts.length && <p className="member-hint">No members yet.</p>}
        {['pending', 'running', 'completed'].includes(sync?.status) && <p className="member-hint" role="status">
          {['pending', 'running'].includes(sync?.status) ? sync.error ? 'Payment scan will retry shortly.' : 'Updating past payments…'
            : sync?.status === 'completed' ? `${sync.changed} ${sync.changed === 1 ? 'payment updated' : 'payments updated'}.` : ''}
        </p>}
        <ul className="member-list">
          {contacts.map((c, i) => (
            <li key={i} className="member-list-item">
              <span className="member-avatar" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase()}</span>
              <div className="member-list-info">
                <span className="member-list-name">{c.name}</span>
                <span className="member-hint">{[c.relationship, c.phone].filter(Boolean).join(' · ')}</span>
              </div>
              <div className="member-list-actions">
                <button type="button" className="link-button" disabled={remove.isPending} aria-label={`Edit ${c.name}`} onClick={() => setEditor({ index: i })}>Edit</button>
                <button type="button" className="link-button" disabled={remove.isPending} aria-label={`Remove ${c.name}`} onClick={() => remove.mutate({ familyContacts: contacts.filter((_, n) => n !== i) }, { onSuccess: () => toast('Member removed') })}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        {remove.isError && <p className="import-error">{describeError(remove.error)}</p>}
      </div>
      {editor && <MemberEditor contacts={contacts} index={editor.index} onClose={() => setEditor(null)} />}
    </section>
  );
}
