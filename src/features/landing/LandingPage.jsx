import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BlurText } from '../../components/fx/BlurText';
import { CountUp } from '../../components/fx/CountUp';
import ShinyText from '../../components/reactbits/ShinyText';
import { CHAPTERS, KINDS, T, at, chapterAt } from './journey';
import { useLandingKit } from './useLandingKit';

// three.js only loads with the scene, not with the page's words
const JourneyScene = lazy(() => import('./JourneyScene'));

/*
 * The landing page is one journey (journey.js): a 3D scene pinned behind chapters of text, from the
 * hero at the very top to the last button. The scene tells the product's story (statements become
 * rows, rows are sorted into five kinds, they are stored on a pen drive that plugs into a laptop),
 * the camera flies into the laptop's screen, and the screen holds two sections of the page (the
 * months and the questions) before the camera pulls out for the close. Then a plain footer.
 *
 * Built on the tasteskill kit in public/kit (.claude/skills/design-taste-frontend): its tokens, type,
 * nav, buttons and grid. The kit's own page rules (one screen per section, no scroll-driven scenes,
 * its dealt hero and moments) are set aside here at the client's request.
 *   palette: the client's own colours (paper #faf9f5, ink #1f1e1d, clay #a5543a)
 *   type: Instrument Sans + DM Mono; buttons pill; radius sharp; nav nav-centre
 * Small animations: the hero headline blurs in (BlurText), the pill shines (React Bits ShinyText),
 * each chapter's lines rise as it arrives, the March figures count up once (CountUp).
 */

const Arrow = () => (
  <svg className="m-arrow" viewBox="0 0 12 12" aria-hidden="true">
    <path className="m-arrow__stem" d="M1 6h8" />
    <path className="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5" />
  </svg>
);

const Acorn = () => (
  <svg className="sq-acorn" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 14c0 7 3.5 12 8 14 4.5-2 8-7 8-14" fill="#cc785c" />
    <path d="M6 14c0-4 4.5-6.5 10-6.5S26 10 26 14H6z" fill="#d4a27f" />
    <path d="M16 7.5c0-2 1-3.5 3-4.5" />
  </svg>
);

// Six months of the kinds of money, in thousands of rupees.
const BARS = [
  { m: 'Oct', spent: 55, invested: 25, moved: 12, lent: 0 },
  { m: 'Nov', spent: 50, invested: 25, moved: 16, lent: 3 },
  { m: 'Dec', spent: 72, invested: 25, moved: 21, lent: 0 },
  { m: 'Jan', spent: 62, invested: 25, moved: 18, lent: 5 },
  { m: 'Feb', spent: 53, invested: 25, moved: 15, lent: 0 },
  { m: 'Mar', spent: 48, invested: 25, moved: 15, lent: 4 },
];
const BAR_MAX = Math.max(...BARS.map((b) => b.spent + b.invested + b.moved + b.lent));

const FAQ = [
  ['Which banks can it read?', 'SBI and Kotak PDF e-statements, password-protected ones too.'],
  ['Where is my ledger kept?', 'In your own database, on the machine where Squirl runs.'],
  ['What if two statements overlap?', 'Rows imported before are recognised and skipped.'],
  ['Can I undo a statement import?', 'Yes. Undo removes every row that import added.'],
  ['Can I hide amounts in the ledger?', 'Guest mode swaps every amount for dots until you turn it off.'],
];

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** A rupee figure that counts up once, when `active` first turns true. */
function Figure({ value, active }) {
  return <CountUp value={active ? value : 0} format={rupees} duration={1.2} />;
}

function LandingNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

  useEffect(() => {
    document.body.classList.toggle('nav-locked', open);
    const close = () => setOpen(false);
    const escape = (event) => {
      if (event.key === 'Escape' && open) {
        close();
        toggleRef.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    desktop.addEventListener('change', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.body.classList.remove('nav-locked');
      desktop.removeEventListener('change', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <header className={`nav nav--centre${open ? ' is-open' : ''}`} onClick={(event) => { if (event.target.closest('a')) setOpen(false); }}>
      <div className="wrap nav__bar">
        <a className="skip-link" href="#top">Skip to content</a>
        <a className="nav__logo" href="#top"><Acorn />Squirl</a>
        <nav className="nav__links" aria-label="Main">
          <div className="nav__item"><a className="nav__link" href="#imports">Imports</a></div>
          <div className="nav__item"><a className="nav__link" href="#sorting">Categories</a></div>
          <div className="nav__item"><a className="nav__link" href="#machine">Privacy</a></div>
          <div className="nav__item"><a className="nav__link" href="#months">Months</a></div>
          <div className="nav__item"><a className="nav__link" href="#faq">Questions</a></div>
        </nav>
        <div className="nav__actions">
          <a className="nav__link" href="/login">Sign in</a>
          <a className="btn btn--primary" href="/signup">Start your ledger</a>
        </div>
        <button ref={toggleRef} className="nav__toggle" type="button" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d={open ? 'M4 4l10 10M14 4L4 14' : 'M2 5h14M2 13h14'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

function MonthsPanel({ active }) {
  return (
    <div className="wrap">
      <div className="grid grid--top">
        <h2 id="months-h" className="span-5">Five kinds of money, month by month</h2>
        <div className="span-6 start-7">
          <p className="t-lead">Each month beside the five before it.</p>
        </div>
      </div>
      <div className="ui sq-dash" role="img" aria-label="Squirl’s dashboard: six months of spending split into spent, invested, moved and lent, beside a written highlight for March">
        <div className="sq-dash__chart" aria-hidden="true">
          <div className="sq-pane-head">
            <b>October to March</b>
            <span className="sq-legend"><i data-kind="spent" />Spent<i data-kind="invested" />Invested<i data-kind="moved" />Moved<i data-kind="lent" />Lent</span>
          </div>
          <div className="sq-bars">
            {BARS.map((b) => (
              <div key={b.m} className="sq-bar">
                <div className="sq-bar__stack" style={{ height: `${((b.spent + b.invested + b.moved + b.lent) / BAR_MAX) * 100}%` }}>
                  {['lent', 'moved', 'invested', 'spent'].map((k) => (b[k] ? <i key={k} data-kind={k} style={{ flexGrow: b[k] }} /> : null))}
                </div>
                <span>{b.m}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sq-dash__note" aria-hidden="true">
          <div className="sq-pane-head"><b>Highlights for March</b></div>
          <div className="sq-note">You spent <b><Figure value={48210} active={active} /></b>, 9% less than February. Food delivery came to <b><Figure value={3120} active={active} /></b> over 11 orders.</div>
          <div className="sq-note"><b><Figure value={25000} active={active} /></b> went to SIPs, and the ₹4,000 you lent for the Goa trip came back.</div>
          <div className="sq-note sq-small">Written by your local model. Every figure is worked out by Squirl.</div>
        </div>
      </div>
    </div>
  );
}

function FaqPanel() {
  return (
    <div className="wrap">
      <div className="grid grid--top">
        <div className="span-5">
          <h2 id="faq-h">Questions</h2>
          <div className="ui sq-banks" role="img" aria-label="The statements Squirl reads: SBI and Kotak PDF e-statements, password-protected ones included">
            <div className="sq-banks__head" aria-hidden="true"><b>Statements Squirl reads</b><span>PDF</span></div>
            <ul aria-hidden="true">
              <li><span className="sq-bank">SBI</span><span><b>State Bank of India</b><span>e-statement · password-protected</span></span></li>
              <li><span className="sq-bank" data-bank="Kotak">Kotak</span><span><b>Kotak Mahindra Bank</b><span>e-statement · password-protected</span></span></li>
            </ul>
          </div>
        </div>
        <div className="faq span-6 start-7">
          {FAQ.map(([q, a]) => (
            <div key={q} className="faq__item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StartPanel() {
  return (
    <div className="wrap">
      <div className="sq-start">
        <h2 id="start-h" className="sq-plug__h1">Start with last month’s statement</h2>
        <p className="sq-plug__line">One PDF is enough to see the month.</p>
        <div className="btn-row">
          <a className="btn btn--primary" href="/signup">Start your ledger<Arrow /></a>
        </div>
      </div>
    </div>
  );
}

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const between = (p, [a, b]) => clamp01((p - a) / (b - a));
const RAIL = CHAPTERS.filter((c) => c.label);

function Journey() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const railRef = useRef(null);
  const monthsRef = useRef(null);
  const faqRef = useRef(null);
  const startRef = useRef(null);
  const progress = useRef(0); // the smoothed scroll: the scene and the panels both read this one value
  const [arrived, setArrived] = useState(false);
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /*
   * Scroll to progress. The exact progress is read from the layout on every scroll and resize; the
   * value everything is drawn from eases towards it (frame-rate independent), which takes the
   * steps out of a mouse wheel. Both are functions of where the page is, never of how it got
   * there, so scrolling back, an anchor jump and a reload mid-page all settle on the same picture.
   */
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;
    const panels = [monthsRef.current, faqRef.current, startRef.current];
    const railLinks = railRef.current ? [...railRef.current.querySelectorAll('a')] : [];
    // Delayed markup misses both the browser's fragment attempt and scroll restoration on reload.
    let saved;
    try {
      if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
        saved = JSON.parse(window.sessionStorage.getItem('squirlLandingScroll'));
      }
    } catch { /* Storage may be unavailable. Native anchors still work. */ }
    if (saved?.href === window.location.href && Number.isFinite(saved.y)) window.scrollTo({ top: saved.y, behavior: 'instant' });
    else document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
    const saveScroll = () => {
      try {
        window.sessionStorage.setItem('squirlLandingScroll', JSON.stringify({ y: window.scrollY, href: window.location.href }));
      } catch { /* Storage may be unavailable. */ }
    };
    window.addEventListener('pagehide', saveScroll);
    if (reduced) {
      setArrived(true);
      return () => window.removeEventListener('pagehide', saveScroll);
    }

    let target = 0;
    let smooth = 0;
    let raf = 0;
    let last = 0;
    let activeId = '';

    const show = (el, opacity) => {
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      el.style.pointerEvents = opacity > 0.97 ? 'auto' : 'none';
      el.inert = opacity <= 0.97;
      el.style.setProperty('--o', opacity.toFixed(3));
    };
    const draw = (p) => {
      progress.current = p;
      stage.dataset.p = p.toFixed(4); // for tests and debugging: the progress on show
      const inScreen = between(p, T.zoom) * (1 - between(p, T.unzoom));
      const paper = between(p, T.paper) * (1 - between(p, T.paperOut));
      const live = 1 - between(p, T.panelsOut);
      const toFaq = between(p, T.toFaq);
      const months = between(p, T.months) * (1 - clamp01(toFaq * 2)) * live;
      stage.style.setProperty('--shade', (1 - inScreen).toFixed(3));
      stage.style.setProperty('--paper', paper.toFixed(3));
      stage.toggleAttribute('data-on-paper', paper > 0.5);
      show(panels[0], months);
      show(panels[1], clamp01(toFaq * 2 - 1) * live);
      show(panels[2], between(p, T.outro));
      if (months > 0.9) setArrived(true);
      const id = chapterAt(p);
      if (id !== activeId) {
        activeId = id;
        // the rail marks the last labelled chapter reached
        let on = RAIL[0].id;
        for (const c of RAIL) if (p >= at(c.id) - 0.0005) on = c.id;
        for (const link of railLinks) {
          link.toggleAttribute('data-on', link.dataset.id === on);
          if (link.dataset.id === on) link.setAttribute('aria-current', 'step');
          else link.removeAttribute('aria-current');
        }
      }
    };
    const measure = () => {
      const travel = section.offsetHeight - stage.offsetHeight;
      target = travel > 0 ? clamp01(-section.getBoundingClientRect().top / travel) : 0;
    };
    const tick = (now) => {
      raf = 0;
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); // capped: a tab coming back from sleep does not leap
      last = now;
      const gap = target - smooth;
      if (Math.abs(gap) < 0.0002) smooth = target;
      else smooth += gap * (1 - Math.exp(-dt * (Math.abs(gap) > 0.1 ? 14 : 7.5))); // a long jump catches up faster
      draw(smooth);
      if (smooth !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      measure();
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    measure();
    smooth = target; // the first picture is where the page already is: no fly-through on load
    draw(smooth);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onScroll);

    // each chapter's lines rise as it arrives and fall back as it leaves, in either direction
    const texts = [...section.querySelectorAll('.sq-chapter__text')];
    let io;
    const observeText = () => {
      io?.disconnect();
      const h = stage.clientHeight;
      io = new IntersectionObserver(
        // Light text only when nearly whole inside the reading band, below the picture on phones.
        (entries) => entries.forEach((entry) => entry.target.toggleAttribute('data-in', entry.intersectionRatio >= 0.85)),
        // Vertical percentage root margins use viewport WIDTH, not height.
        { rootMargin: window.innerWidth < 900 ? `-${h * 0.44}px 0px 0px 0px` : `-${h * 0.2}px 0px -${h * 0.1}px 0px`, threshold: [0, 0.85, 1] },
      );
      texts.forEach((el) => io.observe(el));
    };
    observeText();
    const ro = new ResizeObserver(() => { observeText(); onScroll(); });
    ro.observe(section);
    ro.observe(stage);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', saveScroll);
      document.removeEventListener('visibilitychange', onScroll);
    };
  }, [reduced]);

  return (
    <section ref={sectionRef} className="section sq-plug ground-inverse" id="journey" data-reduced={reduced ? '' : undefined} aria-labelledby="hero-h">
      <div className="sq-plug__chapters">
        {CHAPTERS.map((c) => {
          if (c.kind === 'spacer') return <div key={c.id} id={reduced ? undefined : c.id} className="sq-chapter sq-chapter--spacer" style={{ '--ch': c.h }} aria-hidden="true" />;
          return (
            <div key={c.id} id={c.id} className={`sq-chapter${c.kind === 'hero' ? ' sq-chapter--hero' : ''}`} style={{ '--ch': c.h }}>
              <div className="wrap">
                {c.kind === 'hero' ? (
                  <div className="sq-chapter__text">
                    <a className="pill" href="#imports">
                      <ShinyText text="Reads SBI and Kotak PDFs" color="#faf9f5" shineColor="#e09a7f" speed={3} delay={1.5} />
                      <span className="muted">See imports</span>
                    </a>
                    <BlurText as="h1" id="hero-h" className="sq-plug__h1" text="A money ledger on your own machine" stagger={0.07} />
                    <p className="sq-plug__line">Drop in a bank statement. Every row lands sorted, in your own database.</p>
                    <div className="btn-row">
                      <a className="btn btn--primary" href="/signup">Start your ledger</a>
                      <a className="btn btn--secondary" href="#imports">See how it works</a>
                    </div>
                  </div>
                ) : (
                  <div className="sq-chapter__text">
                    <h2 className="sq-plug__title">{c.title}</h2>
                    <p className="sq-plug__line">{c.line}</p>
                    {c.points && (
                      <ul className={`sq-plug__points${c.kinds ? ' sq-plug__points--kinds' : ''}`}>
                        {c.points.map((point, i) => (
                          <li key={point} style={c.kinds ? { '--dot': KINDS[i].color } : undefined}>{point}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sq-plug__pin">
        <div ref={stageRef} className="sq-plug__stage">
          {!reduced && (
            <Suspense fallback={null}>
              <JourneyScene progress={progress} className="sq-plug__scene" />
            </Suspense>
          )}
          <div className="sq-plug__paper" aria-hidden="true" />
          <div ref={monthsRef} id={reduced ? 'months' : undefined} className="sq-panel sq-panel--months ground-base" role="region" aria-labelledby="months-h">
            <MonthsPanel active={arrived} />
          </div>
          <div ref={faqRef} id={reduced ? 'faq' : undefined} className="sq-panel sq-panel--faq ground-base" role="region" aria-labelledby="faq-h">
            <FaqPanel />
          </div>
          <div ref={startRef} id={reduced ? 'start' : undefined} className="sq-panel sq-panel--start" role="region" aria-labelledby="start-h">
            <StartPanel />
          </div>
          <nav ref={railRef} className="sq-rail" aria-label="Chapters">
            {RAIL.map((c) => (
              <a key={c.id} href={`#${c.id}`} data-id={c.id}><span>{c.label}</span></a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="sq-foot ground-inverse" id="contact">
      <div className="wrap">
        <div className="sq-foot__top">
          <div className="sq-foot__brand">
            <a className="nav__logo" href="#top"><Acorn />Squirl</a>
            <p>Bank statements, sorted on your machine</p>
          </div>
          <nav className="sq-foot__links" aria-label="Footer">
            <a href="#imports">Imports</a>
            <a href="#sorting">Categories</a>
            <a href="#machine">Privacy</a>
            <a href="#months">Months</a>
            <a href="#faq">Questions</a>
            <a href="/login">Sign in</a>
          </nav>
        </div>
        <p className="sq-foot__legal">© 2026 Squirl</p>
      </div>
    </footer>
  );
}

export function LandingPage() {
  const ready = useLandingKit();
  if (!ready) return null;
  return (
    <>
      <LandingNav />
      <main id="top" tabIndex={-1}>
        <Journey />
      </main>
      <Footer />
    </>
  );
}
