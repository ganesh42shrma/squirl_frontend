import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { CalendarCheck, CheckCircle, Clock, HouseLine, Repeat, TrendUp } from '@phosphor-icons/react';
import { useSceneProgress } from '../useScene';

// Sample figures for the drawings only.
const CARDS = [
  {
    key: 'loan',
    Icon: HouseLine,
    kicker: 'Loans & EMIs',
    title: 'See what’s left on every loan.',
    body: 'Add a loan once with its rate and tenure. Squirl tracks each EMI, what you’ve paid, and flags an EMI that doesn’t match the figures.',
    tone: 'clay',
    visual: 'loan',
  },
  {
    key: 'subs',
    Icon: Repeat,
    kicker: 'Subscriptions',
    title: 'Every quiet renewal, in one list.',
    body: 'Streaming, music, cloud storage: what’s due this month, what’s been paid, and what you might have forgotten about.',
    tone: 'heather',
    visual: 'subs',
  },
  {
    key: 'auto',
    Icon: CalendarCheck,
    kicker: 'Auto-debits',
    title: 'Due dates, checked against your statements.',
    body: 'SIPs, bills and standing instructions are matched to the rows in your imports, so you can see what went through and what was missed.',
    tone: 'olive',
    visual: 'auto',
  },
];

function LoanVisual() {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="pv pv--loan">
      <svg viewBox="0 0 120 120" className="pv-ring" aria-hidden="true" focusable="false">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--stone-strong)" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--clay)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * 0.62} ${c}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="pv-ring__label">
        <strong>62%</strong>
        <span>repaid</span>
      </div>
      <dl className="pv-facts">
        <div>
          <dt>EMI</dt>
          <dd>₹18,400</dd>
        </div>
        <div>
          <dt>Left</dt>
          <dd>₹9.1L</dd>
        </div>
        <div>
          <dt>Next</dt>
          <dd>5 Dec</dd>
        </div>
      </dl>
    </div>
  );
}

function SubsVisual() {
  const rows = [
    { name: 'Music', amt: '₹119', state: 'Paid', ok: true },
    { name: 'Streaming', amt: '₹649', state: 'Due 14 Nov', ok: false },
    { name: 'Cloud storage', amt: '₹130', state: 'Paid', ok: true },
    { name: 'Gym membership', amt: '₹1,500', state: 'Due 28 Nov', ok: false },
  ];
  return (
    <ul className="pv pv--subs">
      {rows.map((row) => (
        <li key={row.name}>
          <span className="pv-subs__name">{row.name}</span>
          <span className="pv-subs__amt">{row.amt}</span>
          <span className={`pv-state${row.ok ? ' is-ok' : ''}`}>
            {row.ok ? <CheckCircle aria-hidden="true" weight="fill" /> : <Clock aria-hidden="true" weight="bold" />}
            {row.state}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AutoVisual() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const marks = { 5: 'paid', 10: 'paid', 14: 'due', 18: 'paid', 25: 'missed' };
  return (
    <div className="pv pv--auto">
      <div className="pv-cal">
        {days.map((d) => (
          <span key={d} className={`pv-cal__day${marks[d] ? ` is-${marks[d]}` : ''}`}>
            {d}
          </span>
        ))}
      </div>
      <div className="pv-legend">
        <span className="is-paid">Matched</span>
        <span className="is-due">Upcoming</span>
        <span className="is-missed">Not found</span>
      </div>
      <p className="pv-auto__line">
        <TrendUp aria-hidden="true" weight="bold" /> SIP auto-debit · 10 Nov · matched
      </p>
    </div>
  );
}

const VISUALS = { loan: LoanVisual, subs: SubsVisual, auto: AutoVisual };

/** Each card pins in turn; as the next one slides over it, it sinks back and tilts away. */
function StackCard({ card, index, total, progress }) {
  const last = index === total - 1;
  const span = 1 / total;
  const range = [index * span, (index + 1) * span];
  const scale = useTransform(progress, range, [1, last ? 1 : 0.92]);
  const rotateX = useTransform(progress, range, [0, last ? 0 : 6]);
  const dim = useTransform(progress, range, [0, last ? 0 : 0.4]);
  const Visual = VISUALS[card.visual];
  const { Icon } = card;

  return (
    <motion.article
      className={`stack-card stack-card--${card.tone}`}
      style={{ '--i': index, scale, rotateX }}
    >
      <div className="stack-card__copy">
        <p className="stack-card__kicker">
          <Icon aria-hidden="true" weight="duotone" /> {card.kicker}
        </p>
        <h3>{card.title}</h3>
        <p>{card.body}</p>
      </div>
      <div className="stack-card__visual" aria-hidden="true">
        <Visual />
      </div>
      <motion.span className="stack-card__dim" style={{ opacity: dim }} aria-hidden="true" />
    </motion.article>
  );
}

export function PaymentsStack() {
  const cardsRef = useRef(null);
  const progress = useSceneProgress(cardsRef, { offset: ['start 120px', 'end end'], restAt: 0 });
  return (
    <section className="stack" id="payments" aria-labelledby="payments-title">
      <div className="stack__intro">
        <p className="kicker">Payments</p>
        <h2 id="payments-title" className="section-title">
          The money that leaves on its own, accounted for.
        </h2>
        <p className="section-lede">Loans, subscriptions and auto-debits, each with what’s due, what’s paid and what’s left.</p>
      </div>
      <div className="stack__cards" ref={cardsRef}>
        {CARDS.map((card, i) => (
          <StackCard key={card.key} card={card} index={i} total={CARDS.length} progress={progress} />
        ))}
      </div>
    </section>
  );
}
