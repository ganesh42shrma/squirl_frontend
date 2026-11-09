import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { BlurText } from '../../../components/fx/BlurText';
import { Acorn, Leaf, PeekingSquirrel, Squiggle } from '../LandingArt';
import { useDetachedProgress, useFinePointer } from '../useScene';

const EASE = [0.22, 1, 0.36, 1];

// Sample rows for the drawing. Spent = 20 + 15,000 + 1,240 = 16,260.
const ROWS = [
  { date: '09 Nov', what: 'Chai at the corner stall', cat: 'Cafes & Coffee', tone: 'clay', amount: '₹20' },
  { date: '08 Nov', what: 'Rent', cat: 'Housing', tone: 'clay', amount: '₹15,000' },
  { date: '07 Nov', what: 'Weekly groceries', cat: 'Groceries', tone: 'clay', amount: '₹1,240' },
  { date: '05 Nov', what: 'Monthly SIP', cat: 'Investment', tone: 'sky', amount: '₹5,000' },
  { date: '01 Nov', what: 'Salary', cat: 'Income', tone: 'olive', amount: '+₹62,000' },
];

// November's salary split by kind of money: 16,260 spent, 5,000 invested, the rest kept.
const DONUT = [
  { tone: 'var(--clay)', share: 16260 / 62000 },
  { tone: 'var(--sky)', share: 5000 / 62000 },
  { tone: 'var(--olive)', share: 1 - 21260 / 62000 },
];

function Donut() {
  const r = 26;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--stone-strong)" strokeWidth="10" />
      {DONUT.map((s) => {
        const len = s.share * c;
        const el = (
          <circle
            key={s.tone}
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={s.tone}
            strokeWidth="10"
            strokeDasharray={`${len - 1.5} ${c - len + 1.5}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 36 36)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

/** One depth layer of the hero stage: sits at `z`, drifts up at its own rate as you scroll away. */
function Layer({ z, drift, progress, className, children, delay = 0, from = 40 }) {
  const reduceMotion = useReducedMotion();
  const y = useTransform(progress, [0, 1], [0, -drift]);
  return (
    <motion.div className={`hs-layer ${className}`} style={{ z, y }}>
      <motion.div
        className="hs-layer__in"
        initial={reduceMotion ? false : { opacity: 0, y: from, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function HeroScene() {
  const reduceMotion = useReducedMotion();
  const finePointer = useFinePointer();
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const detached = useDetachedProgress(scrollYProgress);
  const still = useMotionValue(0);
  const progress = reduceMotion ? still : detached;

  // Pointer tilt, eased by a spring. Only on hover-capable pointers and with motion allowed.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.6 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform([sy, progress], ([y, p]) => 10 - y * 10 + p * 22);
  const stageScale = useTransform(progress, [0, 1], [1, 0.9]);
  const copyY = useTransform(progress, [0, 1], [0, 80]);
  const copyOpacity = useTransform(progress, [0, 0.8], [1, 0.2]);

  const tiltEnabled = finePointer && !reduceMotion;
  const onPointerMove = (event) => {
    if (!tiltEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };

  const rise = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay, ease: EASE },
        };

  return (
    <section className="hero" ref={heroRef} aria-label="Introduction" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <motion.div className="hero__copy" style={{ y: copyY, opacity: copyOpacity }}>
        <motion.p className="eyebrow" {...rise(0.05)}>
          <Acorn size={18} className="eyebrow__acorn" />
          A ledger that stays with you
        </motion.p>
        <div className="hero__title-wrap">
          <BlurText as="h1" className="hero__title" text="Know where your money goes." delay={0.15} />
          <Squiggle className="hero__squiggle" />
        </div>
        <motion.p className="hero__lede" {...rise(0.9)}>
          Log spending like a spreadsheet, bring in your SBI and Kotak statements, and watch each month sort itself
          out. All on your own machine.
        </motion.p>
        <motion.div className="hero__actions" {...rise(1.05)}>
          <Link to="/signup" className="btn btn--primary hero__cta">
            Start your ledger
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
          <Link to="/app/imports" className="text-link">
            Import a statement
          </Link>
        </motion.div>
        <motion.p className="hero__signin" {...rise(1.2)}>
          Already keeping one? <Link to="/login">Sign in</Link>
        </motion.p>
      </motion.div>

      <div className="hero__art" aria-hidden="true">
        <motion.div
          className={`hero-stage${tiltEnabled ? '' : ' hero-stage--idle'}`}
          style={{ rotateX, rotateY, scale: stageScale }}
        >
          <Layer z={-140} drift={40} progress={progress} className="hs-wash" delay={0}>
            <svg viewBox="0 0 400 360">
              <path
                d="M60 120C90 40 230 10 320 60c80 44 80 160 30 214-50 54-190 62-260 18C30 256 30 190 60 120z"
                fill="var(--clay)"
                opacity="0.85"
              />
              <circle cx="330" cy="62" r="34" fill="var(--kraft)" />
            </svg>
          </Layer>

          <Layer z={-60} drift={90} progress={progress} className="hs-sheet" delay={0.25}>
            <div className="paper-sheet">
              <div className="paper-sheet__head">
                <span className="paper-sheet__bank">SBI</span>
                <span>e-statement · Oct</span>
              </div>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="paper-sheet__line" style={{ width: `${88 - ((i * 23) % 40)}%` }} />
              ))}
              <span className="paper-sheet__fold" />
            </div>
          </Layer>

          <Layer z={0} drift={150} progress={progress} className="hs-ledger" delay={0.4}>
            <div className="mini-ledger">
              <div className="mini-ledger__head">
                <div>
                  <span className="mini-ledger__label">November</span>
                  <strong>₹16,260 spent</strong>
                </div>
                <span className="mini-ledger__chip">5 entries</span>
              </div>
              <ul>
                {ROWS.map((row) => (
                  <li key={row.what}>
                    <span className="mini-ledger__date">{row.date}</span>
                    <span className="mini-ledger__what">{row.what}</span>
                    <span className={`cat-chip cat-chip--${row.tone}`}>{row.cat}</span>
                    <span className={`mini-ledger__amt${row.tone === 'olive' ? ' is-in' : ''}`}>{row.amount}</span>
                  </li>
                ))}
              </ul>
              <div className="mini-ledger__new">
                <span className="mini-ledger__caret" />
                Type a row, press Enter…
              </div>
            </div>
          </Layer>

          <Layer z={90} drift={210} progress={progress} className="hs-squirrel" delay={0.9} from={60}>
            <PeekingSquirrel className="hs-squirrel__art" />
          </Layer>

          <Layer z={80} drift={240} progress={progress} className="hs-donut" delay={0.7}>
            <div className="float-card">
              <Donut />
              <div>
                <span className="float-card__label">Of November’s salary</span>
                <strong>26% spent · 8% invested</strong>
              </div>
            </div>
          </Layer>

          <Layer z={130} drift={300} progress={progress} className="hs-emi" delay={0.85}>
            <div className="float-card float-card--pill">
              <CheckCircle aria-hidden="true" weight="fill" className="float-card__ok" />
              <div>
                <span className="float-card__label">Home loan EMI</span>
                <strong>Paid · matched on statement</strong>
              </div>
            </div>
          </Layer>

          <Layer z={200} drift={380} progress={progress} className="hs-acorn hs-acorn--a" delay={1.1}>
            <Acorn size={34} className="bob" />
          </Layer>
          <Layer z={170} drift={340} progress={progress} className="hs-acorn hs-acorn--b" delay={1.2}>
            <Acorn size={24} className="bob bob--slow" />
          </Layer>
          <Layer z={150} drift={420} progress={progress} className="hs-leaf" delay={1.3}>
            <Leaf size={40} className="bob bob--sway" />
          </Layer>
        </motion.div>
      </div>

      <motion.a href="#story" className="scroll-cue" {...rise(1.5)}>
        <span className="scroll-cue__dot" aria-hidden="true" />
        See how it works
      </motion.a>
    </section>
  );
}
