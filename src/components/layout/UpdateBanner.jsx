import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import { getUpdateMode, updatePwa } from '../../pwa/client';
import { useUpdates } from '../../pwa/useUpdates';
import { describeError } from '../../api/client';
import { settingsPath } from '../../app/paths';
import './update-banner.css';

/** Shown under the header when a new version has been downloaded and is waiting. */
export function UpdateBanner() {
  const { ready, error } = useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  if (!ready || dismissed) return null;
  const update = async () => {
    setBusy(true); setFailed('');
    try { await updatePwa(); } catch (e) { setFailed(describeError(e)); setBusy(false); }
  };
  return (
    <div className="update-banner" role="status">
      <ArrowsClockwise size={18} aria-hidden="true" />
      <p className="update-banner__text">
        <strong>A new version is ready.</strong>{' '}
        {failed || error || (getUpdateMode() === 'idle' ? 'It will install when you step away. ' : '')}
        <Link to={settingsPath('app')}>Details</Link>
      </p>
      <Button size="small" variant="accent" disabled={busy} onClick={update}>{busy ? 'Updating…' : 'Update now'}</Button>
      <Button size="small" variant="quiet" onClick={() => setDismissed(true)}>Later</Button>
    </div>
  );
}
