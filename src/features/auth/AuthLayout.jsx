import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AcornMark } from '../../components/layout/Logo';
import { at } from '../landing/journey';
import '../../components/ui/ui.css';
import './auth.css';

// The landing page's 3D scene, reused: three.js loads after the form is already on screen.
const JourneyScene = lazy(() => import('../landing/JourneyScene'));
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap';

/*
 * A short stretch of the landing's story played once behind each form, then held (its idle motion,
 * the bob and the pulse of the drive's light, keeps going), with a line of words for each beat:
 *   plug     the pen drive flies to the laptop and plugs in, charge crackles, the screen wakes
 *            (sign-in and sign-up play the same sequence, each with its own words)
 *   still    the closed laptop with the drive's light on (password pages)
 * `lines` are [progress at which the line comes on, the words], in order.
 */
const PLUG = { from: at('plug', 0.02), to: at('private', 0.45), seconds: 4.6 };
const plugLines = (a, b, c) => [[0, a], [at('plug', 0.3), b], [at('plug', 0.85), c]];

const SCENES = {
  signin: { ...PLUG, lines: plugLines('Plug back in', 'Charged on your own hardware', 'Your ledger, where you left it') },
  signup: { ...PLUG, lines: plugLines('Plug in', 'Runs on your own hardware', 'Your ledger starts here') },
  still: { from: 1, to: 1, seconds: 0, lines: [] },
};

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** The scene behind the form and the line of words that goes with each beat of it. */
function AuthBackdrop({ scene, reduced }) {
  const { from, to, seconds, lines } = SCENES[scene] ?? SCENES.still;
  const progress = useRef(from);
  // with reduced motion there is no sequence: the last line stands
  const [line, setLine] = useState(reduced ? lines.length - 1 : 0);

  useEffect(() => {
    progress.current = from;
    if (reduced || !seconds) return undefined;
    // development only: ?scene-p=0.5 holds the scene at one point of its sequence
    const pinned = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('scene-p')) : NaN;
    if (Number.isFinite(pinned) && window.location.search.includes('scene-p')) {
      progress.current = pinned;
      let on = 0;
      lines.forEach(([when], i) => { if (pinned >= when) on = i; });
      setLine(on);
      return undefined;
    }
    setLine(0);
    let raf = 0;
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / (seconds * 1000));
      const p = from + (to - from) * easeInOut(t);
      progress.current = p;
      let on = 0;
      lines.forEach(([when], i) => { if (p >= when) on = i; });
      setLine((current) => (current === on ? current : on));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    // a beat before it starts, so the scene has loaded and the form has settled
    const wait = setTimeout(() => { raf = requestAnimationFrame(tick); }, 500);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(raf);
    };
  }, [from, to, seconds, lines, reduced]);

  return (
    <>
      <div className="auth__stage" aria-hidden="true">
        {!reduced && (
          <Suspense fallback={null}>
            <JourneyScene progress={progress} className="auth__scene" />
          </Suspense>
        )}
      </div>
      {lines.length > 0 && (
        <p className="auth__caption">
          {/* keyed, so each new line fades in afresh */}
          <span key={line}>{lines[line][1]}</span>
          <span className="auth__caption-dots" aria-hidden="true">
            {lines.map(([when], i) => <i key={when} data-on={i <= line ? '' : undefined} />)}
          </span>
        </p>
      )}
    </>
  );
}

// Shared frame for sign-in, sign-up and password pages: the landing's dark ground and 3D scene,
// with the form on a sheet of the app's paper.
export function AuthLayout({ title, intro, children, footer, scene = 'still' }) {
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // The landing's typeface, loaded once for these pages (the app itself uses its own).
  useEffect(() => {
    if (document.querySelector('link[data-auth-font]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.dataset.authFont = '';
    document.head.append(link);
  }, []);

  return (
    <div className="auth">
      <AuthBackdrop scene={scene} reduced={reduced} />
      <header className="auth__nav">
        <Link to="/" className="auth__logo" aria-label="Squirl home">
          <AcornMark />
          Squirl
        </Link>
      </header>
      <main className="auth__main">
        <section className="auth__card" aria-labelledby="auth-title">
          <h1 id="auth-title">{title}</h1>
          {intro && <p className="auth__intro">{intro}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </section>
      </main>
    </div>
  );
}

// Password input with a show/hide toggle.
export function PasswordField({ label, value, onChange, autoComplete, hint, autoFocus }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="field">
      {label}
      <span className="auth__password">
        <input
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="auth__reveal"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint && <span className="auth__hint">{hint}</span>}
    </label>
  );
}

// Only ever return to a page inside the app (never an arbitrary URL from the query string).
export function safeNext(params) {
  const next = params.get('next') || '';
  return next.startsWith('/app') && !next.startsWith('//') ? next : '/app';
}
