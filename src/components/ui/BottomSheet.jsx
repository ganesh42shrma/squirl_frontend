import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import './bottomSheet.css';

/**
 * A native modal <dialog> anchored to the bottom of the screen: focus stays inside, Back/Esc and a
 * tap on the dim area close it. `full` makes it a full-screen page. It lifts above the on-screen
 * keyboard (via visualViewport) so the footer button stays reachable. Mount to open, unmount to close.
 */
export function BottomSheet({ title, onClose, children, footer, full = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const onCancel = (e) => {
      e.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener('cancel', onCancel);

    const vv = window.visualViewport;
    const fit = () => {
      if (!vv) return;
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      dialog.style.setProperty('--sheet-kb', `${Math.round(covered)}px`);
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
    };
  }, []);

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog ref={ref} className={`sheet${full ? ' sheet--full' : ''}`} aria-labelledby={titleId} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet__frame">
        {!full && <span className="sheet__grabber" aria-hidden="true" />}
        <header className="sheet__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="sheet__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  );
}
