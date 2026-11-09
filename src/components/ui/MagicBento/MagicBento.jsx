import { useEffect, useRef } from 'react';
import './MagicBento.css';

// Content-only adaptation of the supplied React Bits MagicBento reference.
// Cards keep natural heights so charts, tables and focus rings remain usable.
export function MagicBento({ items, className = '' }) {
  const root = useRef(null);
  const frame = useRef(null);
  const point = useRef(null);
  const wave = useRef(null);
  useEffect(() => () => {
    cancelAnimationFrame(frame.current);
    wave.current?.cancel();
  }, []);

  function move(event) {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    point.current = { x: event.clientX, y: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!point.current || !root.current) return;
      for (const cell of root.current.children) {
        const rect = cell.getBoundingClientRect();
        cell.style.setProperty('--mb-x', `${point.current.x - rect.left}px`);
        cell.style.setProperty('--mb-y', `${point.current.y - rect.top}px`);
      }
      root.current.dataset.hover = '';
    });
  }

  function leave() {
    cancelAnimationFrame(frame.current);
    frame.current = null;
    point.current = null;
    if (root.current) delete root.current.dataset.hover;
  }

  function pulse(event) {
    if (event.button !== 0 || event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Clicking a chart, link or form control should only perform that action.
    if (event.target.closest('a, button, input, select, textarea, summary, [role="button"], .recharts-wrapper')) return;
    const card = event.target.closest('.magic-bento__card');
    const ripple = card?.querySelector('.magic-bento__wave');
    if (!ripple?.animate) return;
    const rect = card.getBoundingClientRect();
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    wave.current?.cancel();
    wave.current = ripple.animate([
      { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.25 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
    ], { duration: 650, easing: 'ease-out' });
  }

  return <div ref={root} className={`magic-bento dashboard-widget-grid ${className}`} onPointerMove={move} onPointerLeave={leave} onPointerDown={pulse}>
    {items.map((item) => <div key={item.id} className={`magic-bento__card dashboard-widget-slot${item.full ? ' is-full' : ''}`} data-widget={item.id}>
      <span className="magic-bento__effects" aria-hidden="true"><span className="magic-bento__light" /><span className="magic-bento__wave" /></span>
      <div className="magic-bento__content">{item.content}</div>
    </div>)}
  </div>;
}
