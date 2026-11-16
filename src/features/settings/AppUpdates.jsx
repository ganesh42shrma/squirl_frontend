import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { describeError } from '../../api/client';
import { checkForUpdates, getUpdateMode, setUpdateMode, updatePwa } from '../../pwa/client';
import { describeBuild, useUpdates } from '../../pwa/useUpdates';
import '../profile/profile.css';

const when = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** Settings → App & updates: what version is running, check now, and how updates are applied. */
export function AppUpdates() {
  const { supported, ready, checking, current, next, checkedAt, error } = useUpdates();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [mode, setMode] = useState(getUpdateMode);
  const choose = (value) => { setMode(value); setUpdateMode(value); };
  const run = async (work, done) => {
    setBusy(true); setProblem('');
    try { await work(); if (done) toast(done); } catch (e) { setProblem(describeError(e)); } finally { setBusy(false); }
  };
  const check = () => run(async () => { toast(await checkForUpdates() ? 'A new version is ready' : 'You’re on the latest version'); });

  return (
    <section className="profile-section" aria-labelledby="app-title">
      <div className="profile-section__head">
        <h2 id="app-title">App &amp; updates</h2>
        <p>Keep Squirl current on this device.</p>
      </div>
      <div className="profile-form">
        <dl className="app-version">
          <dt>Version</dt>
          <dd>{describeBuild(current) || (supported ? 'Reading…' : 'Not available here')}</dd>
        </dl>
        {!supported && <p className="member-hint">Updates run in the installed app, over your private HTTPS address.</p>}
        {ready && (
          <p role="status">New version ready{next ? `: ${describeBuild(next)}` : ''}.</p>
        )}
        {supported && !ready && checkedAt && <p className="member-hint" role="status">You’re on the latest version. Checked at {when(checkedAt)}.</p>}
        <div className="profile-form__actions">
          {ready && <Button variant="accent" disabled={busy} onClick={() => run(updatePwa)}>{busy ? 'Updating…' : 'Update now'}</Button>}
          <Button variant="quiet" disabled={busy || checking || !supported} onClick={check}>{checking ? 'Checking…' : 'Check for updates'}</Button>
        </div>
        {(problem || error) && <p className="import-error" role="alert">{problem || error}</p>}
        <fieldset className="notification-options" disabled={!supported}>
          <legend>When a new version is ready</legend>
          <label><input type="radio" name="update-mode" checked={mode === 'idle'} onChange={() => choose('idle')} /> Update when I’m away (recommended)</label>
          <label><input type="radio" name="update-mode" checked={mode === 'ask'} onChange={() => choose('ask')} /> Ask me first</label>
        </fieldset>
        <p className="member-hint">Updates never interrupt typing: if you have unsaved text or a window open, Squirl waits and shows a banner instead.</p>
      </div>
    </section>
  );
}
