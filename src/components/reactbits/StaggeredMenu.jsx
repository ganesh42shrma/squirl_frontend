'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { gsap } from 'gsap';
import './StaggeredMenu.css';

// Adapted from React Bits "Staggered Menu" (MIT + Commons Clause), used here as an in-app module
// launcher rather than a page header. Changes from the original:
//  - items are router <Link>s, and the menu closes on navigation (the parent owns `open`)
//  - the panel is `inert` while closed, so its links leave the tab order
//  - Escape closes it and gives focus back to the button that opened it; on open the first item
//    takes focus and Tab stays inside the panel
//  - prefers-reduced-motion skips the slide/stagger and just fades
//  - colours come from Squirl's theme tokens; the header row and logo are gone (the app shell has
//    its own), only the panel, the staggered layers and a scrim remain
const focusable = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function StaggeredMenu({
  open,
  onClose,
  title = 'Menu',
  items = [],
  quickTitle = 'Quick links',
  quickItems = [],
  colors = ['var(--stone-strong)', 'var(--clay)'],
  position = 'left',
  returnFocusRef,
  id = 'staggered-menu',
}) {
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const layersRef = useRef(null);
  const scrimRef = useRef(null);
  const timeline = useRef(null);
  const wasOpen = useRef(false);

  const offscreen = position === 'left' ? -100 : 100;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts = () => {
    const panel = panelRef.current;
    return {
      panel,
      layers: Array.from(layersRef.current?.querySelectorAll('.sm-prelayer') || []),
      labels: Array.from(panel?.querySelectorAll('.sm-item__label') || []),
      extras: Array.from(panel?.querySelectorAll('.sm-item__meta, .sm-quick__title, .sm-quick__link') || []),
    };
  };

  // Resting state: everything off screen.
  useLayoutEffect(() => {
    const { panel, layers, labels, extras } = parts();
    gsap.set([panel, ...layers], { xPercent: offscreen });
    gsap.set(labels, { yPercent: 140, rotate: 8 });
    gsap.set(extras, { opacity: 0, y: 12 });
    gsap.set(scrimRef.current, { opacity: 0 });
    return () => {
      timeline.current?.kill();
      // The menu mounts already open on the first click (it loads lazily). React's StrictMode then
      // tears the effects down and runs them again; forgetting that it was open lets the open
      // animation play again instead of leaving the panel parked off screen.
      wasOpen.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playOpen = useCallback(() => {
    const { panel, layers, labels, extras } = parts();
    timeline.current?.kill();
    wrapRef.current.dataset.present = '';
    if (reduced()) {
      gsap.set([...layers], { xPercent: offscreen, opacity: 0 });
      gsap.set([panel, ...labels], { xPercent: 0, yPercent: 0, rotate: 0 });
      gsap.set(extras, { opacity: 1, y: 0 });
      timeline.current = gsap.fromTo([panel, scrimRef.current], { opacity: 0 }, { opacity: 1, duration: 0.12 });
      return;
    }
    gsap.set(layers, { opacity: 1 });
    const tl = gsap.timeline();
    layers.forEach((layer, i) => tl.fromTo(layer, { xPercent: offscreen }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07));
    const at = layers.length ? (layers.length - 1) * 0.07 + 0.08 : 0;
    tl.fromTo(scrimRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0);
    tl.fromTo(panel, { xPercent: offscreen }, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, at);
    tl.to(labels, { yPercent: 0, rotate: 0, duration: 0.9, ease: 'power4.out', stagger: 0.08 }, at + 0.1);
    tl.to(extras, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, at + 0.25);
    timeline.current = tl;
  }, [offscreen]);

  const playClose = useCallback(() => {
    const { panel, layers, labels, extras } = parts();
    timeline.current?.kill();
    const done = () => {
      delete wrapRef.current?.dataset.present;
      gsap.set(labels, { yPercent: 140, rotate: 8 });
      gsap.set(extras, { opacity: 0, y: 12 });
    };
    if (reduced()) {
      timeline.current = gsap.to([panel, scrimRef.current], { opacity: 0, duration: 0.1, onComplete: () => { gsap.set([panel, ...layers], { xPercent: offscreen }); done(); } });
      return;
    }
    timeline.current = gsap.to([panel, ...layers], { xPercent: offscreen, duration: 0.32, ease: 'power3.in', overwrite: 'auto', onComplete: done });
    gsap.to(scrimRef.current, { opacity: 0, duration: 0.25 });
  }, [offscreen]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      playOpen();
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false;
      playClose();
      // Give focus back, unless the person already moved it somewhere else (e.g. followed a link).
      const active = document.activeElement;
      if (!active || active === document.body || panelRef.current?.contains(active)) returnFocusRef?.current?.focus({ preventScroll: true });
    }
    return undefined;
  }, [open, playOpen, playClose, returnFocusRef]);

  // The first item takes focus once the panel is interactive.
  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => panelRef.current?.querySelector('.sm-item')?.focus({ preventScroll: true }), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  // Escape closes; Tab loops inside the panel while it is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panelRef.current?.querySelectorAll(focusable) || []).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <div ref={wrapRef} className="sm-wrap" data-position={position} data-open={open || undefined}>
      <div ref={scrimRef} className="sm-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={layersRef} className="sm-prelayers" aria-hidden="true">
        {colors.slice(0, 3).map((color, i) => <div key={i} className="sm-prelayer" style={{ background: color }} />)}
      </div>
      <aside id={id} ref={panelRef} className="sm-panel" role="dialog" aria-modal="true" aria-label={title} inert={!open}>
        <div className="sm-panel__head">
          <p className="sm-panel__title">{title}</p>
          <button type="button" className="sm-close" onClick={onClose} aria-label="Close menu"><X size={18} aria-hidden="true" /></button>
        </div>
        <ul className="sm-list" role="list">
          {items.map((item, index) => (
            <li key={item.id} className="sm-list__row">
              <Link to={item.to} className="sm-item" aria-current={item.current ? 'page' : undefined} data-index={String(index + 1).padStart(2, '0')}>
                <span className="sm-item__clip"><span className="sm-item__label">{item.label}</span></span>
                <span className="sm-item__meta">
                  <span>{item.description}</span>
                  {item.badge && <span className="sm-badge">{item.badge}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {quickItems.length > 0 && (
          <div className="sm-quick">
            <h2 className="sm-quick__title">{quickTitle}</h2>
            <ul className="sm-quick__list" role="list">
              {quickItems.map((item) => (
                <li key={item.label}><Link to={item.to} className="sm-quick__link">{item.label}</Link></li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
