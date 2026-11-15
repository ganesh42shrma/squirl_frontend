import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, describeError } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { SaveBar } from '../../components/ui/SaveBar';
import { hasChanges } from '../../lib/settingsDraft';
import { useToast } from '../../components/ui/Toast';
import { useGuestMode } from '../../lib/useGuestMode';
import { SMS_BANKS, SMS_REASONS, accountDraft, accountsPayload, pairingCode } from './smsSetup';
import { useSmsAccounts, useSmsDevices, useSmsReview, useSaveSmsAccounts, useRevokeSmsDevice, useRemoveSmsDevice, useResolveSms } from './useSms';

function AccountSetup({ accounts }) {
  const [draft, setDraft] = useState(() => accountDraft(accounts));
  const [baseline, setBaseline] = useState(() => accountDraft(accounts)); // what's saved: Save only matters when the draft differs
  const [error, setError] = useState('');
  const save = useSaveSmsAccounts();
  const toast = useToast();
  useEffect(() => { setDraft(accountDraft(accounts)); setBaseline(accountDraft(accounts)); }, [accounts]);
  const dirty = hasChanges(draft, baseline);
  const set = (bank, changes) => setDraft((d) => ({ ...d, [bank]: { ...d[bank], ...changes } }));
  const submit = (event) => {
    event.preventDefault(); setError('');
    let body;
    try { body = accountsPayload(draft); } catch (e) { setError(e.message); return; }
    save.mutate(body, { onSuccess: (saved) => {
      // Show what the server kept straight away; the refetch that follows agrees with it.
      const next = accountDraft(saved);
      setDraft(next); setBaseline(next);
      toast('Bank settings saved');
    } });
  };
  return <form className="profile-form" onSubmit={submit}>
    {Object.entries(SMS_BANKS).map(([bank, preset]) => <fieldset className="sms-bank" key={bank} disabled={save.isPending}>
      <legend>{preset.label}</legend>
      <label className="sms-check"><input type="checkbox" checked={draft[bank].enabled} disabled={draft[bank].saved} onChange={(e) => set(bank, { enabled: e.target.checked })} />{draft[bank].saved ? 'Set up' : `Track ${preset.label}`}</label>
      {draft[bank].enabled && <>
        <label className="field">Last 4 digits of account
          <input className="input" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required value={draft[bank].last4} readOnly={draft[bank].saved} autoComplete="off" onChange={(e) => set(bank, { last4: e.target.value })} />
        </label>
        <label className="field">Sender names
          <textarea className="input sms-senders" value={draft[bank].senders} rows={3} required spellCheck={false} autoComplete="off" maxLength={400} onChange={(e) => set(bank, { senders: e.target.value })} />
        </label>
        <p className="cm-hint">One per line, e.g. {preset.senders[0]}.</p>
      </>}
    </fieldset>)}
    {(error || save.isError) && <p className="import-error" role="alert">{error || describeError(save.error)}</p>}
    <SaveBar submit dirty={dirty} idleText={accounts.length ? undefined : 'No bank set up yet'} pending={save.isPending} error={Boolean(error) || save.isError}
      onDiscard={() => { setDraft(baseline); setError(''); save.reset(); }} />
  </form>;
}

function Devices({ accounts }) {
  const devices = useSmsDevices();
  const revoke = useRevokeSmsDevice();
  const remove = useRemoveSmsDevice();
  const client = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('My phone');
  const [pair, setPair] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const secure = window.location.protocol === 'https:';
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const device = (await api('/sms/devices', { method: 'POST', body: { name } })).data;
      if (!mounted.current) { await api(`/sms/devices/${device.id}`, { method: 'DELETE' }); return; }
      setPair({ device, code: pairingCode(window.location.origin, device, accounts) });
      client.invalidateQueries({ queryKey: ['sms', 'devices'] });
    } catch (e) { if (mounted.current) setError(describeError(e)); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <div className="profile-form">
    <h3>Phones</h3>
    <form className="profile-form" onSubmit={create}>
      <label className="field">Phone name<input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
      {!secure && <p className="cm-hint">Open Squirl from your secure address to connect a phone.</p>}
      <div><Button type="submit" disabled={busy || !accounts.length || !secure || !name.trim()}>{busy ? 'Connecting…' : 'Connect a phone'}</Button></div>
      {!accounts.length && <p className="cm-hint">Save a bank first.</p>}
    </form>
    {devices.isLoading && <p role="status">Loading…</p>}
    {devices.isError && <p className="import-error" role="alert">{describeError(devices.error)}</p>}
    {devices.data?.length === 0 && <p className="cm-hint">No phones connected.</p>}
    <ul className="sms-devices">{devices.data?.map((device) => <li key={device.id}>
      <div><strong>{device.name}</strong><p className="cm-hint">{device.revokedAt ? 'Disconnected' : device.lastSeenAt ? `Last message ${new Date(device.lastSeenAt).toLocaleString()}` : 'Waiting for first message'}</p></div>
      {device.revokedAt && <Button variant="quiet" disabled={remove.isPending} onClick={() => remove.mutate(device.id, { onSuccess: () => toast('Phone removed from the list') })}>Remove<span className="visually-hidden"> {device.name}</span></Button>}
      {!device.revokedAt && <Button variant="quiet" disabled={revoke.isPending} onClick={() => revoke.mutate(device.id, { onSuccess: () => { if (pair?.device.id === device.id) setPair(null); toast('Phone disconnected'); } })}>Disconnect<span className="visually-hidden"> {device.name}</span></Button>}
    </li>)}</ul>
    {(error || revoke.isError || remove.isError) && <p className="import-error" role="alert">{error || describeError(revoke.error || remove.error)}</p>}
    {pair && <Dialog title="Connect your phone" onClose={() => setPair(null)} footer={<Button onClick={() => setPair(null)}>Done</Button>}>
      <div className="profile-form">
        <p>Copy the code and paste it into the Squirl SMS app on your phone.</p>
        <p className="cm-hint">It’s shown only once. Lost it? Disconnect the phone and connect again.</p>
        <Button onClick={async () => { try { await navigator.clipboard.writeText(pair.code); toast('Code copied'); } catch { setError('Couldn’t copy. Try again.'); } }}>Copy code</Button>
        {error && <p className="import-error" role="alert">{error}</p>}
      </div>
    </Dialog>}
  </div>;
}

function ReviewPayment({ event, accounts, onClose }) {
  const resolve = useResolveSms();
  const toast = useToast();
  const parsed = event.parsed || {};
  const [form, setForm] = useState({ date: parsed.date || '', amount: parsed.amount ?? '', type: parsed.type || 'debit',
    refNo: parsed.refNo || '', last4: parsed.last4 || accounts.find((a) => a.bank === event.bank)?.last4 || '', description: parsed.description || '' });
  const [notice, setNotice] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const complete = (fields) => resolve.mutate({ id: event.id, fields }, { onSuccess: (result) => {
    if (result.status === 'review') { setNotice(SMS_REASONS[result.reason] || result.reason || 'This payment still needs review.'); return; }
    if (result.status === 'ignored') { toast(SMS_REASONS[result.reason] || 'Not added.'); onClose(); return; }
    toast(fields ? 'Payment added' : 'Dismissed'); onClose();
  } });
  return <Dialog title="Review payment" onClose={() => !resolve.isPending && onClose()} footer={<>
    <Button variant="quiet" disabled={resolve.isPending} onClick={() => complete()}>Dismiss</Button>
    <Button type="submit" form="sms-review-payment" disabled={resolve.isPending || !event.bank}>{resolve.isPending ? 'Saving…' : 'Add payment'}</Button>
  </>}>
    <form id="sms-review-payment" className="profile-form" onSubmit={(e) => { e.preventDefault(); setNotice(''); complete({ ...form, amount: Number(form.amount) }); }}>
      <p>{SMS_REASONS[event.reason] || 'Check the details.'}</p>
      <p className="cm-hint">{event.sender} · {new Date(event.receivedAt).toLocaleString()}</p>
      <blockquote className="sms-body">{event.body}</blockquote>
      {event.previousTransaction && <div className="sms-previous"><strong>Earlier entry</strong><p>{event.previousTransaction.description}</p>{event.previousTransaction.notes && <p>Notes: {event.previousTransaction.notes}</p>}</div>}
      {!event.bank && <p className="import-error">Couldn’t tell which bank sent this. Dismiss it.</p>}
      <label className="field">Bank<input className="input" value={SMS_BANKS[event.bank]?.label || 'Unknown'} readOnly /></label>
      <label className="field">Account ending<input className="input" value={form.last4} onChange={set('last4')} required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} /></label>
      <label className="field">Date<input className="input" type="date" value={form.date} onChange={set('date')} required /></label>
      <label className="field">Amount (₹)<input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} required /></label>
      <label className="field">Direction<select className="select" value={form.type} onChange={set('type')}><option value="debit">Money out</option><option value="credit">Money in</option></select></label>
      <label className="field">UPI reference<input className="input" value={form.refNo} onChange={set('refNo')} required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} /></label>
      <label className="field">Description<input className="input" value={form.description} onChange={set('description')} required maxLength={500} /></label>
      {(notice || resolve.isError) && <p className="import-error" role="alert">{notice || describeError(resolve.error)}</p>}
    </form>
  </Dialog>;
}

function ReviewQueue({ accounts }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const events = useSmsReview(page);
  return <div className="profile-form">
    <h3>To review{events.data ? ` · ${events.data.meta.total}` : ''}</h3>
    {events.isLoading && <p role="status">Loading…</p>}
    {events.isError && <p className="import-error" role="alert">{describeError(events.error)}</p>}
    {events.data?.items.length === 0 && <p className="cm-hint">{page === 1 ? 'Nothing to review.' : 'Nothing more.'}</p>}
    <ul className="sms-devices">{events.data?.items.map((event) => <li key={event.id}>
      <div><strong>{SMS_BANKS[event.bank]?.label || event.sender}</strong><p className="cm-hint">{SMS_REASONS[event.reason] || 'Check this message.'}</p></div>
      <Button variant="quiet" onClick={() => setSelected(event)}>Review<span className="visually-hidden"> message from {event.sender}</span></Button>
    </li>)}</ul>
    {(page > 1 || events.data?.meta.pages > 1) && <nav className="profile-form__actions" aria-label="SMS review pages">
      <Button variant="quiet" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
      <span>Page {page}</span><Button variant="quiet" disabled={!events.data || page >= events.data.meta.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
    </nav>}
    {selected && <ReviewPayment event={selected} accounts={accounts} onClose={() => setSelected(null)} />}
  </div>;
}

function PrivateSetup() {
  const accounts = useSmsAccounts();
  return <div className="profile-form sms-setup">
    {accounts.isLoading && <p role="status">Loading…</p>}
    {accounts.isError && <p className="import-error" role="alert">{describeError(accounts.error)}</p>}
    {accounts.data && <><AccountSetup accounts={accounts.data} /><Devices accounts={accounts.data} /><ReviewQueue accounts={accounts.data} /></>}
  </div>;
}

export function BankSms() {
  const { guestMode } = useGuestMode();
  return <section className="profile-section" aria-labelledby="bank-sms-title">
    <div className="profile-section__head"><h2 id="bank-sms-title">Bank SMS</h2><p>Add payments automatically from your bank’s texts.</p></div>
    {guestMode ? <p className="cm-hint">Hidden in guest mode.</p> : <PrivateSetup />}
  </section>;
}
