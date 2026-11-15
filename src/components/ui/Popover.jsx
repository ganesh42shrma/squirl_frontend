import { useEffect, useId, useRef, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';

/**
 * A button that opens a small panel under it. Escape and clicks outside close it and focus goes
 * back to the button. `children` is the panel; pass a function to receive `close`.
 */
export function Popover({ label, icon, active = false, badge, align = 'left', children, className = '' }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef(null);
  const button = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); button.current?.focus(); }
    };
    const onDown = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  const close = () => { setOpen(false); button.current?.focus(); };
  return (
    <div className={`popover ${className}`} ref={root}>
      <button ref={button} type="button" className={`popover__button${active ? ' is-active' : ''}`} aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)}>
        {icon}
        <span>{label}</span>
        {badge ? <span className="popover__badge">{badge}</span> : null}
        <CaretDown size={12} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className={`popover__panel popover__panel--${align}`} role="dialog" aria-label={typeof label === 'string' ? label : undefined}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
