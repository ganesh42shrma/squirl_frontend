import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { SaveBar } from '../../components/ui/SaveBar';
import { hasChanges, normalisePreferences } from '../../lib/settingsDraft';
import { useToast } from '../../components/ui/Toast';
import { api, describeError } from '../../api/client';
import { clearBrowserPush, enablePush, getRegistration, getSubscription, paymentRepliesReady, supportsPush, updatePwa } from '../../pwa/client';

export function DeviceNotifications() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [preferences, setPreferences] = useState(null); // what's on screen
  const [savedPreferences, setSavedPreferences] = useState(null); // what the server has
  const [saveFailed, setSaveFailed] = useState(false);
  const [saving, setSaving] = useState(false); // busy because of Save itself, not a test or turn-off
  const [endpoint, setEndpoint] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [repliesReady, setRepliesReady] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = supportsPush();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const subscription = await getSubscription();
      const saved = (await api('/notifications/status', { method: 'POST', body: { endpoint: subscription?.endpoint || null } })).data;
      const worker = await getRegistration();
      if (cancelled) return;
      setEndpoint(subscription?.endpoint || null);
      setStatus(saved);
      setPreferences(normalisePreferences(saved.preferences));
      setSavedPreferences(normalisePreferences(saved.preferences));
      setWorkerReady(Boolean(worker?.active));
      const replies = await paymentRepliesReady();
      if (!cancelled) setRepliesReady(replies);
    })().catch((e) => { if (!cancelled) setError(describeError(e)); });
    return () => { cancelled = true; };
  }, []);

  const work = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(describeError(e)); } finally { setBusy(false); }
  };
  const save = () => work(async () => {
    setSaveFailed(false); setSaving(true);
    try {
      const subscription = await getSubscription();
      if (!subscription) throw new Error('Enable notifications on this device first.');
      const saved = (await api('/notifications/subscription', { method: 'PUT', body: { subscription: subscription.toJSON(), preferences } })).data;
      setStatus(saved);
      // The server's copy is now the baseline, so Save goes quiet until the next change.
      setSavedPreferences(normalisePreferences(saved.preferences));
      setPreferences(normalisePreferences(saved.preferences)); // show exactly what the server kept
      toast('Notification settings saved');
    } catch (e) {
      setSaveFailed(true);
      throw e;
    } finally {
      setSaving(false);
    }
  });
  const enable = () => {
    // Permission is requested inside the button click; do not fetch settings before this call.
    const pending = enablePush(status.publicKey);
    return work(async () => {
      const subscription = await pending;
      setEndpoint(subscription.endpoint);
      try {
        const saved = (await api('/notifications/subscription', { method: 'PUT', body: { subscription: subscription.toJSON(), preferences } })).data;
        setStatus(saved);
        setSavedPreferences(normalisePreferences(saved.preferences));
        toast('Notifications enabled on this device');
      } catch (e) {
        await subscription.unsubscribe().catch(() => {});
        setEndpoint(null);
        throw e;
      }
    });
  };
  const disable = () => work(async () => {
    // Remove server delivery first; a failed request must not pretend reminders are disabled.
    if (endpoint) await api('/notifications/remove', { method: 'POST', body: { endpoint } });
    setStatus((s) => ({ ...s, enabled: false }));
    await clearBrowserPush();
    setEndpoint(null);
    toast('Notifications disabled on this device');
  });
  const test = (kind = 'test') => work(async () => {
    await api('/notifications/test', { method: 'POST', body: { endpoint, kind } });
    toast('Test sent');
  });
  const set = (key, value) => setPreferences((p) => ({ ...p, [key]: value }));
  const enabled = status?.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  const dirty = Boolean(enabled) && hasChanges(preferences, savedPreferences);
  const timesValid = Boolean(preferences?.dailyTime && preferences?.habitTime);

  return (
    <section className="profile-section" aria-labelledby="notifications-title">
      <div className="profile-section__head">
        <h2 id="notifications-title">Notifications</h2>
        <p>For this device. Tip: add Squirl to your home screen.</p>
      </div>
      <div className="profile-form">
        <p className={`settings-state${enabled ? ' settings-state--on' : ''}`} role="status">{enabled ? 'On for this device' : 'Off on this device'}</p>
        {!supported && <p>Not supported in this browser. Try Chrome.</p>}
        {status && !status.ready && <p>Not available yet.</p>}
        {supported && status?.ready && !workerReady && <p>Reload the page once to finish setup.</p>}
        {supported && <>
          {repliesReady === false && <p role="status">Update the app to reply to payment alerts.</p>}
          <div><Button variant="quiet" onClick={() => work(updatePwa)} disabled={busy}>Update app</Button></div>
        </>}
        {preferences && (
          <>
            <fieldset className="notification-options" disabled={busy}>
              <legend>Remind me about</legend>
              <label><input type="checkbox" checked={preferences.tasks} onChange={(e) => set('tasks', e.target.checked)} /> Tasks</label>
              <label><input type="checkbox" checked={preferences.habits} onChange={(e) => set('habits', e.target.checked)} /> Habits</label>
              <label><input type="checkbox" checked={preferences.bills} onChange={(e) => set('bills', e.target.checked)} /> Bills and EMIs</label>
              <label><input type="checkbox" checked={preferences.smsPayments !== false} onChange={(e) => set('smsPayments', e.target.checked)} /> New payments</label>
              <label><input type="checkbox" checked={preferences.captures !== false} onChange={(e) => set('captures', e.target.checked)} /> Unsorted captures</label>
            </fieldset>
            <label className="sms-check">
              <input type="checkbox" checked={preferences.details !== false} onChange={(e) => set('details', e.target.checked)} disabled={busy} />
              Show amounts and names
            </label>
            <label className="field">Daily reminder
              <input className="input" type="time" value={preferences.dailyTime} onChange={(e) => set('dailyTime', e.target.value)} disabled={busy} required />
            </label>
            <label className="field">Habit reminder
              <input className="input" type="time" value={preferences.habitTime} onChange={(e) => set('habitTime', e.target.value)} disabled={busy} required />
            </label>
          </>
        )}
        {preferences && !enabled && <p className="cm-hint">These choices are saved when you turn notifications on.</p>}
        {error && <p className="import-error" role="alert">{error}</p>}
        {enabled ? (
          <SaveBar
            dirty={dirty}
            pending={saving}
            error={saveFailed}
            invalid={!timesValid || (busy && !saving)}
            onSave={save}
            onDiscard={() => { setPreferences(savedPreferences); setSaveFailed(false); setError(''); }}
          >
            <Button variant="quiet" onClick={() => test()} disabled={busy}>Send test</Button>
            <Button variant="quiet" onClick={() => test('sms_payment')} disabled={busy || !repliesReady}>Test payment alert</Button>
            <Button variant="quiet" onClick={disable} disabled={busy}>Turn off</Button>
          </SaveBar>
        ) : (
          <div className="profile-form__actions">
            <Button onClick={enable} disabled={busy || !supported || !status?.ready || !workerReady || !timesValid}>Turn on</Button>
            {endpoint && <Button variant="quiet" onClick={disable} disabled={busy}>Turn off</Button>}
          </div>
        )}
      </div>
    </section>
  );
}
