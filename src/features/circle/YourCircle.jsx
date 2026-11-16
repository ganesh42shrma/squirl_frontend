import { useEffect, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { useDebouncedValue } from '../../lib/hooks';
import { useFamilySync } from '../auth/useAuth';
import { ImportContacts } from './ImportContacts';
import { PersonEditor } from './PersonEditor';
import { familyToast, initialOf, personSubtitle } from './circleModel';
import { usePeople, useRemovePerson, useUpdatePerson } from './useCircle';
import '../profile/profile.css';
import './circle.css';

const PAGE_SIZE = 50;

/** Settings → Your circle: everyone from your phone book plus anyone you add. Family is a switch on each person. */
export function YourCircle() {
  const [text, setText] = useState('');
  const [familyOnly, setFamilyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null); // { person } — person null means a new one
  const [marking, setMarking] = useState(null); // the person about to be marked family, while we ask
  const search = useDebouncedValue(text.trim(), 250);
  const { data, isLoading, isError, error, isFetching } = usePeople({ search: search || undefined, family: familyOnly || undefined, page, limit: PAGE_SIZE });
  const { data: sync } = useFamilySync();
  const update = useUpdatePerson();
  const remove = useRemovePerson();
  const toast = useToast();
  const items = data?.data || [];
  const meta = data?.meta;
  const busy = update.isPending || remove.isPending;
  const syncing = ['pending', 'running'].includes(sync?.status);
  // Removing the last person on the last page (or narrowing the search) can leave this page past the end.
  useEffect(() => { if (meta && page > Math.max(meta.pages, 1)) setPage(Math.max(meta.pages, 1)); }, [meta, page]);
  // The ticked value is read now: by the time the save finishes, the box has been redrawn from the old list.
  const setFamily = (p, isFamily) => update.mutate({ id: p._id, isFamily }, { onSuccess: () => toast(familyToast(p.name, isFamily)) });

  return (
    <section className="profile-section" aria-labelledby="circle-title">
      <div className="profile-section__head">
        <h2 id="circle-title">Your circle</h2>
        <p>Everyone you know. Payments to people marked Family go to the Family category. Everyone else just gets their name next to their payments.</p>
      </div>
      <div className="member-list-panel">
        <ImportContacts />
        <div className="member-list-head">
          <span className="member-hint">{meta ? `${meta.circle.toLocaleString('en-IN')} ${meta.circle === 1 ? 'person' : 'people'} · ${meta.family.toLocaleString('en-IN')} family` : ''}</span>
          <Button variant="quiet" size="small" onClick={() => setEditor({ person: null })}>Add a person</Button>
        </div>
        <div className="circle-tools">
          <div className="circle-search">
            <MagnifyingGlass size={16} aria-hidden="true" className="circle-search__icon" />
            <input className="input" type="search" placeholder="Search by name or number" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} aria-label="Search your circle" />
          </div>
          <label className="circle-check"><input type="checkbox" checked={familyOnly} onChange={(e) => { setFamilyOnly(e.target.checked); setPage(1); }} /> Family only</label>
        </div>
        {syncing && <p className="member-hint" role="status">{sync.error ? 'Will retry shortly.' : 'Updating past payments…'}</p>}
        {!syncing && sync?.status === 'completed' && sync.changed > 0 && <p className="member-hint" role="status">{`${sync.changed} ${sync.changed === 1 ? 'payment' : 'payments'} updated.`}</p>}
        {isError && <p className="import-error" role="alert">{describeError(error)}</p>}
        {!isLoading && !isError && !items.length && (
          <p className="member-hint">{search || familyOnly ? 'No one matches.' : 'No one yet. Import your contacts above, or add a person.'}</p>
        )}
        <ul className={`member-list circle-list${isFetching ? ' is-refreshing' : ''}`}>
          {items.map((p) => (
            <li key={p._id} className="member-list-item">
              <span className="member-avatar" aria-hidden="true">{initialOf(p.name)}</span>
              <div className="member-list-info">
                <span className="member-list-name">{p.name}</span>
                <span className="member-hint">{personSubtitle(p) || 'No number'}</span>
              </div>
              <label className="circle-family" title="Payments to family go to the Family category">
                <input type="checkbox" checked={p.isFamily} disabled={busy} onChange={(e) => (e.target.checked ? setMarking(p) : setFamily(p, false))} aria-label={`${p.name} is family`} />
                Family
              </label>
              <div className="member-list-actions">
                <button type="button" className="link-button" disabled={busy} aria-label={`Edit ${p.name}`} onClick={() => setEditor({ person: p })}>Edit</button>
                <button type="button" className="link-button" disabled={busy} aria-label={`Remove ${p.name}`} onClick={() => remove.mutate(p._id, { onSuccess: () => toast(p.isFamily ? `${p.name} removed. Updating past payments…` : `${p.name} removed`) })}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        {(update.isError || remove.isError) && <p className="import-error" role="alert">{describeError(update.error || remove.error)}</p>}
        {meta?.pages > 1 && (
          <nav className="circle-pager" aria-label="Pages">
            <Button variant="quiet" size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="member-hint">Page {page} of {meta.pages}</span>
            <Button variant="quiet" size="small" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next</Button>
          </nav>
        )}
      </div>
      {editor && <PersonEditor person={editor.person} onClose={() => setEditor(null)} />}
      {/* One stray tap in a long list would otherwise re-sort past payments, and unticking does not put them back. */}
      {marking && (
        <Dialog title={`Mark ${marking.name} as family?`} onClose={() => setMarking(null)} footer={
          <>
            <Button variant="quiet" onClick={() => setMarking(null)}>Cancel</Button>
            <Button onClick={() => { setFamily(marking, true); setMarking(null); }}>Mark as family</Button>
          </>
        }>
          <p>Payments to {marking.name}, past and future, will go to the Family category. That includes payments you sorted yourself.</p>
          <p className="member-hint">If you change your mind later, those payments move to Other. They don’t go back to where they were.</p>
        </Dialog>
      )}
    </section>
  );
}
