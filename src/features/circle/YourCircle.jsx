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
import { usePeople, useRemovePeople, useRemovePerson, useUpdatePerson } from './useCircle';
import '../profile/profile.css';
import './circle.css';

const PAGE_SIZE = 50;

/** Settings → Your circle: everyone from your phone book plus anyone you add. Family is a switch on each person. */
export function YourCircle() {
  const [text, setText] = useState('');
  const [familyOnly, setFamilyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null); // { person } — person null means a new one
  const [marking, setMarking] = useState(null); // { person, isFamily }: a family change we are asking about
  const [removing, setRemoving] = useState(null);
  const [chooser, setChooser] = useState(false); // the "Remove…" menu
  const [picking, setPicking] = useState(false); // tick-people mode
  const [picked, setPicked] = useState(() => new Map()); // id → person, across pages
  const [bulk, setBulk] = useState(null); // the group we are asking about: 'imported' | 'non_family' | 'picked'
  const search = useDebouncedValue(text.trim(), 250);
  const { data, isLoading, isError, error, isFetching } = usePeople({ search: search || undefined, family: familyOnly || undefined, page, limit: PAGE_SIZE });
  const { data: sync } = useFamilySync();
  const update = useUpdatePerson();
  const remove = useRemovePerson();
  const removeMany = useRemovePeople();
  const toast = useToast();
  const items = data?.data || [];
  const meta = data?.meta;
  const busy = update.isPending || remove.isPending || removeMany.isPending;
  const syncing = ['pending', 'running'].includes(sync?.status);
  // Removing the last person on the last page (or narrowing the search) can leave this page past the end.
  useEffect(() => { if (meta && page > Math.max(meta.pages, 1)) setPage(Math.max(meta.pages, 1)); }, [meta, page]);
  // The ticked value is read now: by the time the save finishes, the box has been redrawn from the old list.
  const setFamily = (p, isFamily) => update.mutate({ id: p._id, isFamily }, { onSuccess: () => toast(familyToast(p.name, isFamily)) });
  const removePerson = (p) => remove.mutate(p._id, { onSuccess: () => { setRemoving(null); toast(p.isFamily ? `${p.name} removed. Updating past payments…` : `${p.name} removed`); } });

  const togglePicked = (p) => setPicked((m) => { const next = new Map(m); if (next.has(p._id)) next.delete(p._id); else next.set(p._id, p); return next; });
  const pageAllPicked = items.length > 0 && items.every((p) => picked.has(p._id));
  const togglePage = () => setPicked((m) => { const next = new Map(m); items.forEach((p) => (pageAllPicked ? next.delete(p._id) : next.set(p._id, p))); return next; });
  const stopPicking = () => { setPicking(false); setPicked(new Map()); };
  const pickedFamily = [...picked.values()].filter((p) => p.isFamily).length;
  const bulkCount = bulk === 'imported' ? meta?.imported ?? 0 : bulk === 'non_family' ? (meta ? meta.circle - meta.family : 0) : picked.size;
  const confirmBulk = () => removeMany.mutate(
    bulk === 'picked' ? { ids: [...picked.keys()] } : { scope: bulk },
    { onSuccess: (r) => { setBulk(null); stopPicking(); toast(r.removed === 1 ? '1 person removed' : `${r.removed} people removed`); } },
  );
  const openBulk = (kind) => { removeMany.reset(); setBulk(kind); };

  return (
    <section className="profile-section" aria-labelledby="circle-title">
      <div className="profile-section__head">
        <h2 id="circle-title">Your circle</h2>
        <p>See names beside payments. Mark family to sort their payments into Family.</p>
      </div>
      <div className="member-list-panel">
        <ImportContacts />
        <div className="member-list-head">
          <span className="member-hint">{meta ? `${meta.circle.toLocaleString('en-IN')} ${meta.circle === 1 ? 'person' : 'people'} · ${meta.family.toLocaleString('en-IN')} family` : ''}</span>
          <div className="circle-head-actions">
            <Button variant="quiet" size="small" disabled={!meta?.circle} onClick={() => setChooser(true)}>Remove…</Button>
            <Button variant="quiet" size="small" onClick={() => setEditor({ person: null })}>Add a person</Button>
          </div>
        </div>
        {picking && (
          <div className="circle-pickbar" role="region" aria-label="Remove people">
            <label className="circle-check"><input type="checkbox" checked={pageAllPicked} onChange={togglePage} /> This page</label>
            <span className="member-hint" role="status">{picked.size} selected</span>
            <Button variant="quiet" size="small" onClick={stopPicking}>Cancel</Button>
            <Button variant="danger" size="small" disabled={!picked.size} onClick={() => openBulk('picked')}>Remove {picked.size || ''}</Button>
          </div>
        )}
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
            <li key={p._id} className={`member-list-item${picking && picked.has(p._id) ? ' is-picked' : ''}`}>
              {picking
                ? <input className="circle-pick" type="checkbox" checked={picked.has(p._id)} onChange={() => togglePicked(p)} aria-label={`Select ${p.name}`} />
                : <span className="member-avatar" aria-hidden="true">{initialOf(p.name)}</span>}
              <div className="member-list-info">
                <span className="member-list-name">{p.name}</span>
                <span className="member-hint">{personSubtitle(p) || 'No number'}</span>
              </div>
              <label className="circle-family" title="Payments to family go to the Family category">
                <input type="checkbox" checked={p.isFamily} disabled={busy} onChange={(e) => setMarking({ person: p, isFamily: e.target.checked })} aria-label={`${p.name} is family`} />
                Family
              </label>
              <div className="member-list-actions">
                <button type="button" className="link-button" disabled={busy} aria-label={`Edit ${p.name}`} onClick={() => setEditor({ person: p })}>Edit</button>
                <button type="button" className="link-button" disabled={busy} aria-label={`Remove ${p.name}`} onClick={() => p.isFamily ? setRemoving(p) : removePerson(p)}>Remove</button>
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
      {chooser && <Dialog title="Remove contacts" onClose={() => setChooser(false)} footer={<Button variant="quiet" onClick={() => setChooser(false)}>Close</Button>}>
        <div className="circle-choices">
          <button type="button" className="circle-choice" disabled={!meta?.imported} onClick={() => { setChooser(false); openBulk('imported'); }}>
            <strong>Imported contacts</strong><span className="member-hint">{meta?.imported ? `${meta.imported.toLocaleString('en-IN')} from your phone book` : 'None to remove'}</span>
          </button>
          <button type="button" className="circle-choice" disabled={!meta || meta.circle - meta.family === 0} onClick={() => { setChooser(false); openBulk('non_family'); }}>
            <strong>Everyone except family</strong><span className="member-hint">{meta ? `${(meta.circle - meta.family).toLocaleString('en-IN')} people` : ''}</span>
          </button>
          <button type="button" className="circle-choice" onClick={() => { setChooser(false); setPicking(true); }}>
            <strong>Pick people</strong><span className="member-hint">Tick them in the list</span>
          </button>
        </div>
      </Dialog>}
      {bulk && <Dialog title={`Remove ${bulkCount.toLocaleString('en-IN')} ${bulkCount === 1 ? 'person' : 'people'}?`} onClose={() => setBulk(null)} footer={
        <>
          <Button variant="quiet" onClick={() => setBulk(null)}>Cancel</Button>
          <Button variant="danger" disabled={removeMany.isPending || bulkCount === 0} onClick={confirmBulk}>{removeMany.isPending ? 'Removing…' : 'Remove'}</Button>
        </>
      }>
        <p>Their names and numbers leave your circle, and the “→ Name” labels on those payments disappear. Your payments and categories stay as they are.</p>
        {bulk === 'picked' && pickedFamily > 0 && <p className="member-hint">{pickedFamily === 1 ? 'One is' : `${pickedFamily} are`} family. Payments in Family matching them will move to Other.</p>}
        {removeMany.isError && <p className="import-error" role="alert">{describeError(removeMany.error)}</p>}
      </Dialog>}
      {editor && <PersonEditor person={editor.person} onClose={() => setEditor(null)} />}
      {removing && <Dialog title={`Remove ${removing.name}?`} onClose={() => setRemoving(null)} footer={
        <>
          <Button variant="quiet" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button disabled={remove.isPending} onClick={() => removePerson(removing)}>Remove</Button>
        </>
      }>
        <p>Payments in Family matching this person will move to Other. Their previous categories won’t be restored.</p>
        {remove.isError && <p className="import-error" role="alert">{describeError(remove.error)}</p>}
      </Dialog>}
      {/* One stray tap in a long list would otherwise re-sort past payments, in either direction, and neither
          change can be undone exactly: unticking moves payments to Other, not back to where they were. */}
      {marking && (marking.isFamily ? (
        <Dialog title={`Mark ${marking.person.name} as family?`} onClose={() => setMarking(null)} footer={
          <>
            <Button variant="quiet" onClick={() => setMarking(null)}>Cancel</Button>
            <Button onClick={() => { setFamily(marking.person, true); setMarking(null); }}>Mark as family</Button>
          </>
        }>
          <p>Payments to {marking.person.name}, past and future, will go to the Family category. That includes payments you sorted yourself.</p>
          <p className="member-hint">If you change your mind later, those payments move to Other. They don’t go back to where they were.</p>
        </Dialog>
      ) : (
        <Dialog title={`${marking.person.name} is no longer family?`} onClose={() => setMarking(null)} footer={
          <>
            <Button variant="quiet" onClick={() => setMarking(null)}>Keep as family</Button>
            <Button onClick={() => { setFamily(marking.person, false); setMarking(null); }}>Not family</Button>
          </>
        }>
          <p>Payments to {marking.person.name} that are in the Family category will move to Other.</p>
          <p className="member-hint">They won’t go back to the categories they had before you marked {marking.person.name} as family. {marking.person.name} stays in your circle.</p>
        </Dialog>
      ))}
    </section>
  );
}
