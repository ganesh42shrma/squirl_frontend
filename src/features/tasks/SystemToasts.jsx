import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { describeEvents, subscribeSystemEvents } from './systemEvents';
import { RankBadge, SystemWindow } from './SystemWindow';
import './system.css';

const MAX_TOASTS = 4;
const TOAST_MS = 4200;
const MOMENT_MS = { level: 3200, rank: 6000 };

/**
 * Turns the `events` the Tasks API returns into System windows: small stacked toasts for XP,
 * quests, streaks and awards, and a centred window for a level-up or a rank-up. Mounted once
 * in the app shell, so it works from any page (including the dashboard widgets).
 */
export function SystemToasts() {
  const [toasts, setToasts] = useState([]);
  const [moment, setMoment] = useState(null);
  const reduced = useReducedMotion();
  const queue = useRef([]);

  const dismiss = useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const closeMoment = useCallback(() => {
    setMoment(null);
  }, []);

  // A level-up or rank-up waits its turn: one centred window at a time, in order.
  useEffect(() => {
    if (moment || !queue.current.length) return;
    setMoment(queue.current.shift());
  }, [moment]);

  useEffect(() => subscribeSystemEvents((events) => {
    const notices = describeEvents(events);
    const small = [];
    for (const n of notices) {
      if (n.kind === 'level' || n.kind === 'rank') queue.current.push(n);
      else small.push(n);
    }
    // A rank-up already says it all: skip the level-up that came with it in the same response.
    if (small.length) {
      setToasts((all) => [...all, ...small].slice(-MAX_TOASTS));
      for (const n of small) window.setTimeout(() => dismiss(n.id), n.tone === 'red' ? TOAST_MS * 1.8 : TOAST_MS);
    }
    setMoment((current) => current || queue.current.shift() || null);
  }), [dismiss]);

  useEffect(() => {
    if (!moment) return undefined;
    const timer = window.setTimeout(closeMoment, MOMENT_MS[moment.kind] || 3200);
    const onKey = (e) => e.key === 'Escape' && closeMoment();
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [moment, closeMoment]);

  const enter = reduced ? { opacity: 0 } : { opacity: 0, scaleY: 0.05, filter: 'brightness(2.4)' };
  const shown = reduced ? { opacity: 1 } : { opacity: 1, scaleY: 1, filter: 'brightness(1)' };
  return (
    <>
      <div className="sys-toasts" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((n) => (
            <motion.div key={n.id} layout={!reduced} initial={enter} animate={shown} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: reduced ? 0.12 : 0.22 }}>
              <SystemWindow as="div" tone={n.tone === 'cyan' ? undefined : n.tone} className={`sys-toast sys-toast--${n.kind}`} onClick={() => dismiss(n.id)}>
                <p className="sys-title">{n.title}</p>
                <p>{n.body}</p>
              </SystemWindow>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {moment && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <motion.div className="sys-moment" key={moment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={closeMoment}>
            <motion.div initial={enter} animate={shown} transition={{ duration: reduced ? 0.12 : 0.3 }} onClick={(e) => e.stopPropagation()}>
              <SystemWindow as="div" tone={moment.tone} className="sys-moment__window" role="alertdialog" aria-live="assertive" aria-label={moment.title}>
                <p className="sys-title">{moment.title}</p>
                {moment.kind === 'rank' && <RankBadge rank={moment.rank} size={96} />}
                {moment.kind === 'level' && <p className="sys-moment__level" aria-hidden="true">{moment.level}</p>}
                <p>{moment.body}</p>
                <p className="sys-moment__hint">Press Esc or click to dismiss</p>
              </SystemWindow>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
