import { useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { RELATIONSHIPS } from '../profile/MemberFields';
import { draftProblem, localPhone, personBody, personDraft } from './circleModel';
import { useCreatePerson, useUpdatePerson } from './useCircle';
import '../profile/profile.css';
import './circle.css';

/** Add or edit one person: name, numbers, and whether they are family (relationship and statement names only matter then). */
export function PersonEditor({ person, onClose }) {
  const editing = Boolean(person);
  const [form, setForm] = useState(() => personDraft(person));
  const [problem, setProblem] = useState('');
  const create = useCreatePerson();
  const update = useUpdatePerson();
  const save = editing ? update : create;
  const toast = useToast();
  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setPhone = (index, value) => setForm((prev) => ({ ...prev, phones: prev.phones.map((p, i) => (i === index ? value.replace(/[^\d+\s-]/g, '') : p)) }));

  const submit = (e) => {
    e.preventDefault();
    const found = draftProblem(form);
    setProblem(found);
    if (found) return;
    const body = personBody(form);
    const done = { onSuccess: () => { toast(editing ? 'Saved' : 'Added to your circle'); onClose(); } };
    if (editing) update.mutate({ id: person._id, ...body }, done);
    else create.mutate(body, done);
  };

  return (
    <Dialog title={editing ? 'Edit person' : 'Add a person'} onClose={onClose} footer={
      <>
        <Button variant="quiet" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="circle-person-form" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </>
    }>
      <form id="circle-person-form" className="profile-form" onSubmit={submit}>
        <label className="field">Name
          <input className="input" autoFocus required minLength={2} maxLength={80} value={form.name} onChange={set('name')} />
        </label>
        <div className="field" role="group" aria-label="Phone numbers">
          <span>Phone numbers <span className="member-optional">Optional</span></span>
          {form.phones.map((phone, i) => (
            <div key={i} className="circle-phone"> {/* eslint-disable-line react/no-array-index-key */}
              <span className="circle-phone__code" aria-hidden="true">+91</span>
              <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(i, e.target.value)} placeholder="10-digit mobile number" aria-label={`Phone number ${i + 1}`} />
              {form.phones.length > 1 && <button type="button" className="circle-icon-btn" onClick={() => setForm((prev) => ({ ...prev, phones: prev.phones.filter((_, n) => n !== i) }))} aria-label={`Remove phone number ${i + 1}`}><X size={14} aria-hidden="true" /></button>}
            </div>
          ))}
          {form.phones.length < 10 && form.phones.every((p) => localPhone(p)) && (
            <button type="button" className="link-button circle-add-phone" onClick={() => setForm((prev) => ({ ...prev, phones: [...prev.phones, ''] }))}><Plus size={12} weight="bold" aria-hidden="true" /> Add another number</button>
          )}
        </div>
        <label className="check-row"><input type="checkbox" checked={form.isFamily} onChange={(e) => setForm((prev) => ({ ...prev, isFamily: e.target.checked }))} /> Family</label>
        <p className="member-hint">Payments to family go to the Family category, including past ones. Everyone else just gets a name next to their payments.</p>
        {form.isFamily && (
          <>
            <label className="field">Relationship
              <select className="select" value={form.relationship} onChange={set('relationship')}>
                <option value="">Choose relationship</option>
                {form.relationship && !RELATIONSHIPS.includes(form.relationship) && <option value={form.relationship}>{form.relationship}</option>}
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="field"><span>Alternate names <span className="member-optional">Optional</span></span>
              <input className="input" value={form.aliases} onChange={set('aliases')} placeholder="Statement names, separated by commas" />
            </label>
          </>
        )}
        {(problem || save.isError) && <p className="import-error" role="alert">{problem || describeError(save.error)}</p>}
      </form>
    </Dialog>
  );
}
