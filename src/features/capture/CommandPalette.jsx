import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Camera, ArrowRight, CalendarCheck, CheckSquare, Flame, HandCoins, Lightning, MagnifyingGlass, NotePencil, Receipt, Sparkle, Target, Tray, UsersThree, X,
} from '@phosphor-icons/react';
import { MODULES } from '../../app/modules';
import { describeError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useDebouncedValue } from '../../lib/hooks';
import { todayISO } from '../../lib/format';
import { navCommands, rankCommands, describeAction, describeResult, resultLink, savedMessage, canUndo, undoMessage, submissionFor, needsCategory, engineFor, photoTarget, EXAMPLES } from './paletteModel';
import { useGuestMode } from '../../lib/useGuestMode';
import { AttachmentsPanel } from '../media/AttachmentsPanel';
import { DEFAULT_MAX_UPLOAD_BYTES, compressImage, validateImageFile } from '../media/imageTools';
import { useMediaStatus, useUploadAttachment } from '../media/useMedia';
import { useAiCategories, useAiPreview, useCaptureInbox, useCapturePreview, useCaptureSearch, useCommitCapture, useDismissCapture, useUndoCapture } from './useCapture';
import './capture.css';

const ICONS = { expense: Receipt, income: HandCoins, task: CheckSquare, habit: Flame, note: NotePencil, goal: Target, bill: CalendarCheck, person: UsersThree, nav: ArrowRight, ai: Sparkle, inbox: Tray };
const COMMANDS = navCommands(MODULES);

function RowIcon({ kind }) {
  const Icon = ICONS[kind] || ArrowRight;
  return <span className={`palette-row__icon palette-row__icon--${kind}`}><Icon size={16} aria-hidden="true" /></span>;
}

/**
 * ⌘K / Ctrl+K anywhere: one box that both captures ("chai 40 upi", "remind me to call mom
 * tomorrow 7pm", "gym done") and finds things (pages, transactions, tasks, habits, goals, bills).
 * Enter saves or opens the highlighted row; ⌘/Ctrl+Enter always saves what you typed.
 * Mount it to open, unmount to close (like Dialog).
 */
export function CommandPalette({ onClose, startIn = 'all' }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [inboxItem, setInboxItem] = useState(null); // an inbox note being re-read
  const [ai, setAi] = useState(null); // { text, actions, understood } from the AI engine
  const [error, setError] = useState('');
  // One photo held on this device until the capture is saved, then attached to what it became.
  const [photo, setPhoto] = useState(null); // { file, url }
  const [attaching, setAttaching] = useState(false);
  const photoRef = useRef(null);
  const cameraRef = useRef(null);
  const { guestMode } = useGuestMode();
  const mediaStatus = useMediaStatus();
  const uploader = useUploadAttachment();
  const photosOn = mediaStatus.data?.configured === true && !guestMode;
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) { setError(problem); return; }
    setError('');
    setPhoto({ file, url: URL.createObjectURL(file) });
    inputRef.current?.focus();
  };

  /** After a save: shrink the held photo and attach it. Returns a message for the toast if it couldn't be. */
  const attachPhoto = async (result) => {
    if (!photo) return null;
    const target = photoTarget(result);
    if (!target) return 'Photos can’t go on a habit check-in, so it wasn’t attached.';
    setAttaching(true);
    try {
      const blob = await compressImage(photo.file);
      if (blob.size > (mediaStatus.data?.maxBytes || DEFAULT_MAX_UPLOAD_BYTES)) return 'Saved, but the photo is too big even after shrinking it.';
      await uploader.upload(target.ownerType, target.ownerId, blob);
      return null;
    } catch (err) {
      return `Saved, but the photo couldn’t be attached: ${err?.name === 'ImageError' ? err.message : describeError(err)}`;
    } finally {
      setAttaching(false);
    }
  };
  const submission = useRef(null); // { fingerprint, clientId } of the save in flight or last failed
  const debounced = useDebouncedValue(text.trim(), 180);

  const settled = useDebouncedValue(text.trim(), 600); // longer pause: the category lookup may call a cloud model

  const preview = useCapturePreview(debounced);
  const search = useCaptureSearch(debounced);
  const inbox = useCaptureInbox();
  const aiPreview = useAiPreview();
  const commit = useCommitCapture();
  const undo = useUndoCapture();
  const dismiss = useDismissCapture();

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus();
    const onCancel = (e) => { e.preventDefault(); closeRef.current(); };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  const typed = text.trim();
  const fresh = preview.data && debounced === typed ? preview.data : null;
  const useAiResult = ai && ai.text === typed;
  const wantsCategory = !useAiResult && settled === typed && debounced === typed && needsCategory(fresh);
  const categorised = useAiCategories(settled, wantsCategory);
  const withCategory = wantsCategory && categorised.data?.aiCategories > 0 ? categorised.data : null;
  const proposal = useAiResult ? ai : withCategory || fresh;
  const today = proposal?.today || preview.data?.today || todayISO();
  const understood = Boolean(proposal?.understood);

  const rows = useMemo(() => {
    const list = [];
    if (!typed) {
      for (const item of (inbox.data?.items || []).slice(0, startIn === 'inbox' ? 10 : 4)) list.push({ id: `inbox:${item._id}`, type: 'inbox', item });
      for (const c of rankCommands(COMMANDS, '', startIn === 'inbox' ? 3 : 6)) list.push({ id: c.id, type: 'nav', command: c });
      return list;
    }
    const captureRow = { id: 'capture', type: 'capture', actions: proposal?.actions || [], pending: !proposal };
    if (understood) list.push(captureRow);
    if (proposal && !understood && !useAiResult) list.push({ id: 'ai', type: 'ai' });
    for (const r of (debounced === typed ? search.data : null) || []) list.push({ id: `${r.kind}:${r.id}`, type: 'result', result: r });
    for (const c of rankCommands(COMMANDS, typed, 5)) list.push({ id: c.id, type: 'nav', command: c });
    if (!understood) list.push(captureRow);
    return list;
  }, [typed, debounced, proposal, understood, useAiResult, search.data, inbox.data, startIn]);

  useEffect(() => setActive(0), [typed]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const save = async () => {
    if (!typed || commit.isPending || attaching) return;
    setError('');
    try {
      const body = {
        text: typed,
        ...(proposal?.actions?.length && { actions: proposal.actions.map(({ type, data }) => ({ type, data })) }),
        ...(inboxItem && { inboxId: inboxItem._id }),
        engine: engineFor(proposal, useAiResult),
      };
      // Pressing Enter again after a failure (or a dropped connection) is the same save, not a second one.
      submission.current = submissionFor(submission.current, body);
      const result = await commit.mutateAsync({ ...body, clientId: submission.current.clientId });
      submission.current = null;
      const photoProblem = await attachPhoto(result);
      const withPhoto = photo && !photoProblem ? ' · photo attached' : '';
      toast(`${savedMessage(result)}${withPhoto}`, canUndo(result) ? { action: { label: 'Undo', onClick: () => undoCapture(result.capture._id) }, duration: 6000 } : undefined);
      if (photoProblem) toast(photoProblem, { tone: 'error' });
      setText(''); setAi(null); setInboxItem(null); setPhoto(null);
      onClose();
    } catch (e) {
      // The server says this id belongs to different text: it can never succeed, so the next try starts fresh.
      if (e?.code === 'CAPTURE_CLIENT_ID_REUSED') submission.current = null;
      setError(describeError(e));
    }
  };

  const undoCapture = (id) => undo.mutate(id, {
    onSuccess: (r) => toast(undoMessage(r.kept)),
    onError: (e) => toast(describeError(e), { tone: 'error' }),
  });

  const askAi = () => {
    setError('');
    aiPreview.mutate(typed, {
      onSuccess: (r) => setAi({ ...r, text: typed }),
      onError: (e) => setError(describeError(e)),
    });
  };

  const open = (to) => { onClose(); navigate(to); };

  const activate = (row) => {
    if (!row) return;
    if (row.type === 'capture') save();
    else if (row.type === 'ai') askAi();
    else if (row.type === 'nav') open(row.command.to);
    else if (row.type === 'result') {
      if (row.result.kind === 'capture') { setInboxItem({ _id: row.result.id, text: row.result.title }); setText(row.result.title); }
      else open(resultLink(row.result));
    } else if (row.type === 'inbox') { setInboxItem(row.item); setText(row.item.text); inputRef.current?.focus(); }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) save();
      else activate(rows[active]);
    }
  };

  const renderRow = (row, index) => {
    const selected = index === active;
    const common = {
      id: `palette-${row.id}`,
      role: 'option',
      'aria-selected': selected,
      className: `palette-row${selected ? ' is-active' : ''}`,
      onMouseMove: () => setActive(index),
      onClick: () => activate(row),
    };
    if (row.type === 'capture') {
      const items = row.actions.length ? row.actions.map((a) => describeAction(a, today)) : [];
      return (
        <li {...common} className={`${common.className} palette-row--capture`}>
          <RowIcon kind={understood ? 'nav' : 'inbox'} />
          <span className="palette-row__body">
            <span className="palette-row__title">
              {commit.isPending ? 'Saving…' : attaching ? 'Attaching photo…' : understood ? `Save${items.length > 1 ? ` ${items.length} items` : ''}` : inboxItem ? 'Keep in inbox' : 'Save to inbox'}
              {useAiResult && <span className="palette-badge">AI</span>}
            </span>
            {row.pending && <span className="palette-row__detail">Reading…</span>}
            {understood && (
              <ul className="palette-actions">
                {items.map((d, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i} className={`palette-action palette-action--${d.kind}`}>
                    <RowIcon kind={d.kind} />
                    <span><strong>{d.title}</strong><small>{d.detail}</small></span>
                  </li>
                ))}
              </ul>
            )}
            {!understood && !row.pending && <span className="palette-row__detail">Not sure what this is. Keep it as a note and sort it later.</span>}
          </span>
          <kbd>{selected ? '↵' : '⌘↵'}</kbd>
        </li>
      );
    }
    if (row.type === 'ai') {
      return (
        <li {...common}>
          <RowIcon kind="ai" />
          <span className="palette-row__body">
            <span className="palette-row__title">{aiPreview.isPending ? 'Asking the AI…' : 'Read it with AI'}</span>
            <span className="palette-row__detail">Uses your AI model from Settings. You confirm before anything is saved.</span>
          </span>
        </li>
      );
    }
    if (row.type === 'inbox') {
      return (
        <li {...common}>
          <RowIcon kind="inbox" />
          <span className="palette-row__body">
            <span className="palette-row__title">{row.item.text}</span>
            <span className="palette-row__detail">Inbox · Enter to sort it</span>
          </span>
          <button
            type="button"
            className="palette-row__dismiss"
            aria-label={`Dismiss “${row.item.text}”`}
            onClick={(e) => { e.stopPropagation(); dismiss.mutate(row.item._id, { onError: (err) => setError(describeError(err)) }); }}
          >
            <X size={14} />
          </button>
        </li>
      );
    }
    const d = row.type === 'result' ? describeResult(row.result, today) : { kind: 'nav', title: row.command.label, detail: row.command.hint };
    return (
      <li {...common}>
        <RowIcon kind={d.kind} />
        <span className="palette-row__body">
          <span className="palette-row__title">{d.title}</span>
          <span className="palette-row__detail">{d.detail}</span>
        </span>
      </li>
    );
  };

  const inboxCount = inbox.data?.total || 0;
  const firstNav = rows.findIndex((r) => r.type === 'nav');
  const firstResult = rows.findIndex((r) => r.type === 'result');
  const firstInbox = rows.findIndex((r) => r.type === 'inbox');

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog ref={ref} className="palette" aria-label="Capture or search" onClick={(e) => e.target === ref.current && onClose()}>
      <div className="palette__frame">
        <div className="palette__search">
          {typed && understood ? <Lightning size={18} aria-hidden="true" /> : <MagnifyingGlass size={18} aria-hidden="true" />}
          <input
            ref={inputRef}
            className="palette__input"
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, 500)); setError(''); }}
            onKeyDown={onKeyDown}
            placeholder="Capture anything, or search…"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `palette-${rows[active].id}` : undefined}
            autoComplete="off"
            spellCheck="false"
            enterKeyHint="done"
          />
          {photosOn && (
            <>
              <button type="button" className="palette__photo-btn" onClick={() => (window.matchMedia?.('(pointer: coarse)').matches ? cameraRef : photoRef).current?.click()} aria-label={photo ? 'Change the photo' : 'Add a photo'} title="Add a photo (receipt, bill…)">
                <Camera size={18} aria-hidden="true" />
              </button>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="Choose a photo" />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pickPhoto} aria-label="Take a photo" />
            </>
          )}
          <button type="button" className="palette__close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {photo && (
          <div className="palette__photo">
            <img src={photo.url} alt="Photo to attach" width={40} height={40} />
            <span>{attaching ? 'Attaching photo…' : typed ? 'This photo will be attached when you save.' : 'Photo ready. Type what it was, like “lunch 450 upi”.'}</span>
            <button type="button" onClick={() => setPhoto(null)} aria-label="Remove the photo" disabled={attaching}><X size={14} /></button>
          </div>
        )}
        {inboxItem && (
          <p className="palette__context">
            Sorting an inbox note. Edit it, then press Enter.
            <button type="button" onClick={() => { setInboxItem(null); setText(''); }}>Cancel</button>
          </p>
        )}
        {inboxItem && photosOn && (
          <div className="palette__inbox-photos">
            {/* Photos already on this note move with it to whatever it becomes when you save. */}
            <AttachmentsPanel ownerType="capture" ownerId={inboxItem._id} />
          </div>
        )}
        {error && <p className="palette__error" role="alert">{error}</p>}
        <ul className="palette__list" id="palette-list" role="listbox" aria-label="Suggestions" ref={listRef}>
          {rows.map((row, i) => (
            <FragmentWithHeading
              key={row.id}
              heading={
                i === firstInbox ? `Inbox · ${inboxCount}` : i === firstResult ? 'Found' : i === firstNav ? (typed ? 'Go to' : 'Jump to') : null
              }
            >
              {renderRow(row, i)}
            </FragmentWithHeading>
          ))}
        </ul>
        {!typed && (
          <div className="palette__examples">
            <span>Try</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => { setText(ex); inputRef.current?.focus(); }}>{ex}</button>
            ))}
          </div>
        )}
        <footer className="palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
          <span><kbd>↵</kbd> choose</span>
          <span><kbd>⌘↵</kbd> save as typed</span>
          <span><kbd>esc</kbd> close</span>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}

function FragmentWithHeading({ heading, children }) {
  return (
    <>
      {heading && <li className="palette__heading" role="presentation">{heading}</li>}
      {children}
    </>
  );
}
