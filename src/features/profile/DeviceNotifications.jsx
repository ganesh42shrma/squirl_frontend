import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { api, describeError } from '../../api/client';
import { clearBrowserPush, enablePush, getRegistration, getSubscription, supportsPush } from '../../pwa/client';

export function DeviceNotifications() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [endpoint, setEndpoint] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
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
      setPreferences(saved.preferences);
      setWorkerReady(Boolean(worker?.active));
    })().catch((e) => { if (!cancelled) setError(describeError(e)); });
    return () => { cancelled = true; };
  }, []);

  const work = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(describeError(e)); } finally { setBusy(false); }
  };
  const save = () => work(async () => {
    const subscription = await getSubscription();
    if (!subscription) throw new Error('Enable notifications on this device first.');
    const saved = (await api('/notifications/subscription', { method: 'PUT', body: { subscription: subscription.toJSON(), preferences } })).data;
    setStatus(saved);
    toast('Reminder settings saved');
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
  const test = () => work(async () => {
    await api('/notifications/test', { method: 'POST', body: { endpoint } });
    toast('Test sent. Check your device notifications.');
  });
  const set = (key, value) => setPreferences((p) => ({ ...p, [key]: value }));
  const enabled = status?.enabled && typeof Notification !== 'undefined' && Notification.permission === 'granted';

  return (
    <section className="profile-section" aria-labelledby="notifications-title">
      <div className="profile-section__head">
        <h2 id="notifications-title">This device</h2>
        <p>Install Squirl from your browser’s menu using Install app or Add to Home screen.</p>
        <p>Reminders hide names and amounts. Messages travel encrypted through your browser’s push service. Open Squirl over Tailscale to see details.</p>
      </div>
      <div className="profile-form">
        <p role="status">{enabled ? 'Notifications are enabled on this device.' : 'Notifications are off on this device.'}</p>
        {!supported && <p>Notifications need a supported browser and a secure connection. Open your Squirl HTTPS address in Chrome.</p>}
        {status && !status.ready && <p>Notifications haven’t been configured on your Squirl computer yet.</p>}
        {supported && status?.ready && !workerReady && <p>Open the built app and reload once to prepare notifications on this device.</p>}
        {preferences && (
          <>
            <fieldset className="notification-options" disabled={busy}>
              <legend>Remind me about</legend>
              <label><input type="checkbox" checked={preferences.tasks} onChange={(e) => set('tasks', e.target.checked)} /> Tasks</label>
              <label><input type="checkbox" checked={preferences.habits} onChange={(e) => set('habits', e.target.checked)} /> Habits</label>
              <label><input type="checkbox" checked={preferences.bills} onChange={(e) => set('bills', e.target.checked)} /> Bills and EMIs</label>
            </fieldset>
            <label className="field">Daily tasks and payment reminder
              <input className="input" type="time" value={preferences.dailyTime} onChange={(e) => set('dailyTime', e.target.value)} disabled={busy} required />
            </label>
            <label className="field">Habit reminder
              <input className="input" type="time" value={preferences.habitTime} onChange={(e) => set('habitTime', e.target.value)} disabled={busy} required />
            </label>
            <p className="cm-hint">Times use the timezone in Tasks settings. Tasks with a due time also get a reminder when due. Completed tasks, finished habits, and recorded payments are skipped. Your computer must be running.</p>
          </>
        )}
        {error && <p className="import-error" role="alert">{error}</p>}
        <div className="profile-form__actions">
          {enabled ? (
            <>
              <Button onClick={save} disabled={busy || !preferences.dailyTime || !preferences.habitTime}>Save reminders</Button>
              <Button variant="quiet" onClick={test} disabled={busy}>Send test</Button>
            </>
          ) : (
            <Button onClick={enable} disabled={busy || !supported || !status?.ready || !workerReady || !preferences?.dailyTime || !preferences?.habitTime}>Enable notifications</Button>
          )}
          {(enabled || endpoint) && <Button variant="quiet" onClick={disable} disabled={busy}>Disable on this device</Button>}
        </div>
      </div>
    </section>
  );
}
