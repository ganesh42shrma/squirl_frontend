import { useMemo, useRef, useState } from 'react';
import { Camera, CaretLeft, CaretRight, ImageSquare } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { describeError } from '../../api/client';
import { useGuestMode } from '../../lib/useGuestMode';
import { DEFAULT_MAX_UPLOAD_BYTES, compressImage, validateImageFile } from './imageTools';
import { mediaFileUrl, useAttachments, useMediaStatus, useRemoveAttachment, useUploadAttachment } from './useMedia';
import './media.css';

const isTouchDevice = () => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0);

function Viewer({ attachments, index, readOnly, onIndex, onClose, onRemove, removing }) {
  // The confirmation belongs to one photo: after removing it the viewer shows the next one, which must ask again.
  const [confirmId, setConfirmId] = useState(null);
  const current = attachments[index];
  if (!current) return null;
  const confirm = confirmId === current.id;
  const setConfirm = (on) => setConfirmId(on ? current.id : null);
  const label = `Photo ${index + 1} of ${attachments.length}`;
  const go = (next) => { setConfirm(false); onIndex(next); };
  return (
    <Dialog
      title={label}
      onClose={onClose}
      footer={<>
        {attachments.length > 1 && <>
          <Button variant="quiet" size="small" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo"><CaretLeft size={14} aria-hidden="true" /></Button>
          <Button variant="quiet" size="small" onClick={() => go(index + 1)} disabled={index === attachments.length - 1} aria-label="Next photo"><CaretRight size={14} aria-hidden="true" /></Button>
        </>}
        {!readOnly && (confirm
          ? <>
            <span className="media-confirm">Remove this photo?</span>
            <Button variant="quiet" size="small" onClick={() => setConfirm(false)}>Keep it</Button>
            <Button variant="danger" size="small" disabled={removing} onClick={() => onRemove(current)}>{removing ? 'Removing…' : 'Yes, remove'}</Button>
          </>
          : <Button variant="quiet" size="small" onClick={() => setConfirm(true)}>Remove</Button>)}
      </>}
    >
      <img className="media-viewer__img" src={mediaFileUrl(current.mediaId)} alt={label} />
    </Dialog>
  );
}

/**
 * Photos on a saved transaction, task or goal. Receipt images show amounts, so guest mode hides them.
 * Everything private is fetched with the session cookie (same origin); nothing is cached in the app.
 */
export function AttachmentsPanel(props) {
  const { guestMode } = useGuestMode();
  return <AttachmentsPanelView {...props} guestMode={guestMode} />;
}

// The panel itself, with guest mode passed in so it can be checked without a browser.
export function AttachmentsPanelView({ ownerType, ownerId, readOnly = false, guestMode = false }) {
  const status = useMediaStatus();
  const configured = status.data?.configured === true;
  const list = useAttachments(ownerType, ownerId, { enabled: configured && !guestMode });
  const uploader = useUploadAttachment();
  const remover = useRemoveAttachment();
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [viewing, setViewing] = useState(-1);
  const [broken, setBroken] = useState(() => new Set());
  const addRef = useRef(null);
  const cameraRef = useRef(null);
  const touch = useMemo(isTouchDevice, []);

  const heading = <h3 className="media-panel__title">Photos</h3>;
  if (guestMode) return <section className="media-panel" aria-label="Photos">{heading}<p className="media-hint">Hidden in guest mode.</p></section>;
  if (status.isLoading || !ownerId) return null;
  if (!configured) return <section className="media-panel" aria-label="Photos">{heading}<p className="media-hint">Photos aren’t set up on this server yet.</p></section>;

  const attachments = list.data || [];
  const max = status.data.maxPerOwner || 10;
  const maxBytes = status.data.maxBytes || DEFAULT_MAX_UPLOAD_BYTES;
  const room = Math.max(0, max - attachments.length);
  const busy = Boolean(progress) || uploader.isPending;

  async function addFiles(files) {
    const picked = [...files];
    if (!picked.length) return;
    setMessage('');
    if (picked.length > room) setMessage(`You can attach up to ${max} photos here. Only the first ${room} will be added.`);
    const errors = [];
    const queue = picked.slice(0, room);
    for (let i = 0; i < queue.length; i += 1) {
      setProgress(queue.length > 1 ? `Uploading photo ${i + 1} of ${queue.length}…` : 'Uploading photo…');
      const problem = validateImageFile(queue[i]);
      if (problem) { errors.push(problem); continue; }
      try {
        const blob = await compressImage(queue[i]);
        if (blob.size > maxBytes) { errors.push('That photo is still too big after shrinking it. Please try a different one.'); continue; }
        await uploader.upload(ownerType, ownerId, blob);
      } catch (err) {
        errors.push(err?.name === 'ImageError' ? err.message : describeError(err));
      }
    }
    setProgress('');
    if (errors.length) setMessage([...new Set(errors)].join(' '));
  }
  const onPick = (e) => { const files = e.target.files; addFiles(files ? [...files] : []); e.target.value = ''; };

  const remove = (attachment) => remover.mutate(
    { id: attachment.id, ownerType, ownerId },
    {
      onSuccess: () => setViewing((i) => (attachments.length <= 1 ? -1 : Math.min(i, attachments.length - 2))),
      onError: (err) => setMessage(describeError(err)),
    },
  );

  return (
    <section className="media-panel" aria-label="Photos" aria-busy={busy}>
      <div className="media-panel__head">
        {heading}
        {!readOnly && (
          <div className="media-actions">
            <Button variant="quiet" size="small" disabled={busy || room === 0} onClick={() => addRef.current?.click()}><ImageSquare size={14} aria-hidden="true" /> Add photo</Button>
            {touch && <Button variant="quiet" size="small" disabled={busy || room === 0} onClick={() => cameraRef.current?.click()}><Camera size={14} aria-hidden="true" /> Take photo</Button>}
          </div>
        )}
      </div>
      {!readOnly && <>
        <input ref={addRef} type="file" accept="image/*" multiple hidden onChange={onPick} aria-label="Choose photos" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} aria-label="Take a photo" />
      </>}

      {list.isLoading && <p className="media-hint">Loading photos…</p>}
      {list.isError && <p className="media-error" role="alert">{describeError(list.error)}</p>}
      {!list.isLoading && !list.isError && attachments.length === 0 && (
        <p className="media-hint">{readOnly ? 'No photos.' : 'No photos yet. Add a receipt or anything you want to keep with this.'}</p>
      )}
      {attachments.length > 0 && (
        <ul className="media-grid" role="list">
          {attachments.map((a, i) => (
            <li key={a.id}>
              <button type="button" className="media-thumb" onClick={() => setViewing(i)} aria-label={`Open photo ${i + 1} of ${attachments.length}`}>
                {broken.has(a.id)
                  ? <span className="media-thumb__missing">Can’t load</span>
                  : <img src={mediaFileUrl(a.mediaId)} alt={`Photo ${i + 1} of ${attachments.length}`} loading="lazy" width={88} height={88} onError={() => setBroken((s) => new Set(s).add(a.id))} />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="media-hint" role="status" aria-live="polite">{progress}</p>
      {!readOnly && room === 0 && <p className="media-hint">You can attach up to {max} photos here. Remove one to add another.</p>}
      {message && <p className="media-error" role="alert">{message}</p>}

      {viewing >= 0 && (
        <Viewer attachments={attachments} index={Math.min(viewing, attachments.length - 1)} readOnly={readOnly}
          onIndex={setViewing} onClose={() => setViewing(-1)} onRemove={remove} removing={remover.isPending} />
      )}
    </section>
  );
}
