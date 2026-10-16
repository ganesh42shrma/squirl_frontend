import { motion, useReducedMotion } from 'motion/react';
import { Ink, Wash } from './Ink';

/**
 * Hero drawing: a squirrel perched on an open ledger, holding up an acorn,
 * with a small stash on the left page. Draws itself in once, on load.
 */
export function SquirrelLedger({ className }) {
  const reduceMotion = useReducedMotion();
  const Text = reduceMotion ? 'text' : motion.text;
  const fadeIn = (delay) =>
    reduceMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8, delay } };

  return (
    <svg
      className={className}
      viewBox="0 0 480 430"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="A squirrel sitting on an open ledger book, holding an acorn"
    >
      {/* Colour washes behind everything */}
      <Wash
        d="M104 146C134 72 266 38 362 78c86 36 104 150 54 214-46 58-178 70-262 26-62-32-78-106-50-172z"
        fill="var(--clay)"
        opacity={0.9}
      />
      <Wash d="M392 58a26 26 0 1 1-52 0 26 26 0 0 1 52 0z" fill="var(--kraft)" delay={0.3} />

      {/* The open ledger */}
      <Ink
        d="M84 330c58-22 112-20 156 2v68c-44-20-98-22-156 0z"
        fill="var(--paper)"
        delay={0.2}
      />
      <Ink
        d="M240 332c44-22 98-24 156-2v70c-58-22-112-20-156 0z"
        fill="var(--paper)"
        delay={0.35}
      />
      <Ink d="M240 332v68" delay={0.5} duration={0.5} />
      <Ink d="M104 346c40-12 80-11 116 2" delay={0.9} duration={0.6} strokeWidth="1.4" />
      <Ink d="M104 364c40-12 80-11 116 2" delay={1.0} duration={0.6} strokeWidth="1.4" />
      <Ink d="M104 382c40-12 80-11 116 2" delay={1.1} duration={0.6} strokeWidth="1.4" />

      {/* Entries written on the left page */}
      <Text x="110" y="341" className="hero-ink-text" stroke="none" {...fadeIn(1.6)} transform="rotate(-4 110 341)">
        chai 20
      </Text>
      <Text x="110" y="359" className="hero-ink-text" stroke="none" {...fadeIn(1.75)} transform="rotate(-4 110 359)">
        rent 15,000
      </Text>
      <Text x="110" y="377" className="hero-ink-text" stroke="none" {...fadeIn(1.9)} transform="rotate(-4 110 377)">
        sip 5,000
      </Text>

      {/* Tail: one big curl behind the body */}
      <Ink
        d="M330 318c62 2 104-46 96-110-6-52-56-82-96-58-28 16-24 58 6 58-14-10-12-34 8-40 30-8 54 22 50 56-4 44-36 68-76 66z"
        fill="var(--kraft)"
        delay={0.7}
        duration={1.4}
      />

      {/* Body */}
      <Ink
        d="M262 338c-18-36-10-88 22-104 32-14 60 12 58 52-2 30-14 50-34 54z"
        fill="var(--paper)"
        delay={0.9}
      />
      {/* Belly line */}
      <Ink d="M282 252c-10 24-10 56 2 80" delay={1.5} duration={0.6} strokeWidth="1.6" />

      {/* Head with a pointed snout facing left */}
      <Ink
        d="M298 206c2-22-14-38-34-36-18 2-30 14-36 30-4 10 2 18 14 20 18 4 54 6 56-14z"
        fill="var(--paper)"
        delay={1.1}
      />
      <Ink d="M276 174l6-26 10 28" fill="var(--paper)" delay={1.4} duration={0.5} />
      <path d="M252 192a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0z" fill="var(--ink)" stroke="none" />
      <path d="M229 202a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0z" fill="var(--ink)" stroke="none" />

      {/* Arm reaching forward, paw cupped under the acorn */}
      <Ink d="M284 250c-14 8-28 10-38 6" delay={1.6} duration={0.5} />
      <Ink d="M250 262c-6 0-10-3-10-7" delay={1.75} duration={0.3} />

      {/* The acorn being held up */}
      <Ink d="M226 236c0 14 7 24 16 28 9-4 16-14 16-28" fill="var(--clay)" delay={1.8} duration={0.6} />
      <Ink d="M222 236c0-8 9-13 20-13s20 5 20 13z" fill="var(--kraft)" delay={1.9} duration={0.5} />
      <Ink d="M242 223c0-4 2-7 6-9" delay={2.0} duration={0.3} />

      {/* Back foot on the page */}
      <Ink d="M300 338c10 2 20 2 28-2" delay={1.7} duration={0.4} />

      {/* The stash: two acorns resting on the left page */}
      <g transform="translate(176 296) rotate(-12)">
        <Ink d="M0 14c0 11 5 18 12 21 7-3 12-10 12-21" fill="var(--clay)" delay={2.1} duration={0.5} />
        <Ink d="M-3 14c0-6 7-10 15-10s15 4 15 10z" fill="var(--kraft)" delay={2.2} duration={0.4} />
      </g>
      <g transform="translate(200 304) rotate(18)">
        <Ink d="M0 12c0 9 4 15 10 18 6-3 10-9 10-18" fill="var(--clay)" delay={2.25} duration={0.5} />
        <Ink d="M-2 12c0-5 5-8 12-8s12 3 12 8z" fill="var(--kraft)" delay={2.35} duration={0.4} />
      </g>
    </svg>
  );
}
