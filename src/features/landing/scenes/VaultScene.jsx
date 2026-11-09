import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { Cpu, Database, EyeSlash, FilePdf } from '@phosphor-icons/react';
import { Leaf, Padlock, StashJar } from '../LandingArt';
import { useSceneProgress } from '../useScene';

const POINTS = [
  {
    Icon: Database,
    title: 'An encrypted database you hold',
    body: 'Everything lives in one encrypted SQLite file. The key stays on your computer.',
  },
  {
    Icon: Cpu,
    title: 'A local model, not a cloud one',
    body: 'Written highlights and category suggestions come from a model running on your own machine.',
  },
  {
    Icon: FilePdf,
    title: 'Statements, not bank passwords',
    body: 'Squirl reads the PDFs you download. It never signs in to your bank.',
  },
  {
    Icon: EyeSlash,
    title: 'Guest mode',
    body: 'Showing someone your screen? Hide every amount with one switch.',
  },
];

/** A ring tag that always turns to face you, fading as it swings round the back of the jar. */
function RingTag({ label, angle, ring }) {
  const transform = useTransform(ring, (r) => `rotateY(${angle}deg) translateZ(var(--ring-r)) rotateY(${-angle - r}deg)`);
  const opacity = useTransform(ring, (r) => 0.3 + 0.7 * ((Math.cos(((angle + r) * Math.PI) / 180) + 1) / 2));
  return (
    <motion.span className="vault__tag" style={{ transform, opacity }}>
      {label}
    </motion.span>
  );
}

const RING = ['Encrypted SQLite', 'Local model', 'No bank logins', 'Undo any import', 'Your own database', 'Guest mode'];

export function VaultScene() {
  const ref = useRef(null);
  const progress = useSceneProgress(ref, { offset: ['start end', 'end start'], restAt: 0.5 });
  const ringY = useTransform(progress, [0, 1], [-60, 300]);
  const jarY = useTransform(progress, [0, 1], [60, -60]);
  const leafA = useTransform(progress, [0, 1], [-120, 220]);
  const leafB = useTransform(progress, [0, 1], [160, -200]);
  const leafC = useTransform(progress, [0, 1], [-40, 120]);
  const leafSpin = useTransform(progress, [0, 1], [-30, 90]);
  const lockY = useTransform(progress, [0, 1], [90, -90]);

  return (
    <section className="vault" ref={ref} aria-labelledby="vault-title">
      <div className="vault__copy">
        <p className="kicker">Private by design</p>
        <h2 id="vault-title" className="section-title">
          Your ledger stays on your machine.
        </h2>
        <ul className="vault__points">
          {POINTS.map(({ Icon, title, body }) => (
            <li key={title}>
              <span className="vault__icon">
                <Icon aria-hidden="true" weight="duotone" />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="vault__art" aria-hidden="true">
        <motion.div className="vault__leaf vault__leaf--a" style={{ y: leafA, rotate: leafSpin }}>
          <Leaf size={56} />
        </motion.div>
        <motion.div className="vault__leaf vault__leaf--b" style={{ y: leafB }}>
          <Leaf size={40} tone="var(--kraft)" />
        </motion.div>
        <motion.div className="vault__leaf vault__leaf--c" style={{ y: leafC, rotate: leafSpin }}>
          <Leaf size={30} tone="var(--clay)" />
        </motion.div>

        <div className="vault__scene">
          <motion.div className="vault__jar" style={{ y: jarY }}>
            <StashJar className="vault__jar-art" />
            <motion.div className="vault__lock" style={{ y: lockY }}>
              <Padlock />
            </motion.div>
          </motion.div>
          <motion.div className="vault__ring" style={{ rotateY: ringY }}>
            {RING.map((label, i) => (
              <RingTag key={label} label={label} angle={i * (360 / RING.length)} ring={ringY} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
