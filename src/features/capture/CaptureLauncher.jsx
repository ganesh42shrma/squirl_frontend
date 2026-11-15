import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lightning } from '@phosphor-icons/react';
import { CommandPalette } from './CommandPalette';
import { useCaptureInbox } from './useCapture';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * The header button plus the global shortcut (⌘K on Mac, Ctrl+K elsewhere). The inbox reminder
 * notification opens /app?capture=inbox, which lands here and opens the palette on the inbox.
 */
export function CaptureLauncher() {
  const [open, setOpen] = useState(null); // null = closed, otherwise 'all' | 'inbox'
  const [params, setParams] = useSearchParams();
  const { data: inbox } = useCaptureInbox();
  const count = inbox?.total || 0;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((current) => (current ? null : 'all'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (params.get('capture') !== 'inbox') return;
    setOpen('inbox');
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('capture'); return next; }, { replace: true });
  }, [params, setParams]);

  return (
    <>
      <button
        type="button"
        className="capture-trigger"
        onClick={() => setOpen('all')}
        aria-label={`Capture or search${count ? `, ${count} in inbox` : ''}`}
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
        title="Capture or search"
      >
        <Lightning size={16} aria-hidden="true" />
        <span className="capture-trigger__label">Capture</span>
        {count > 0 && <span className="capture-trigger__count">{count}</span>}
        <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {open && <CommandPalette startIn={open} onClose={() => setOpen(null)} />}
    </>
  );
}
