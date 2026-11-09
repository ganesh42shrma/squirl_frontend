import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import './dialog.css';

/**
 * A native modal <dialog>, portalled to <body>: focus stays inside, Esc and a click on the
 * backdrop close it, the page behind is inert. Mount it to open, unmount to close.
 */
export function Dialog({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const onCancel = (e) => {
      e.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog ref={ref} className={`ui-dialog${wide ? ' ui-dialog--wide' : ''}`} aria-labelledby="ui-dialog-title" onClick={(e) => e.target === ref.current && onClose()}>
      <div className="ui-dialog__frame">
        <header className="ui-dialog__head">
          <h2 id="ui-dialog-title">{title}</h2>
          <button type="button" className="ui-dialog__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer && <footer className="ui-dialog__foot">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  );
}
