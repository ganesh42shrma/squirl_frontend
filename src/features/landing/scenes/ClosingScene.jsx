import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useTransform } from 'motion/react';
import { ArrowRight } from '@phosphor-icons/react';
import { Acorn } from '../LandingArt';
import { useSceneProgress } from '../useScene';

// Acorns that drop into place as the closing panel scrolls up, each at its own depth.
const DROPS = [
  { x: '8%', size: 30, from: -260, to: 0, rot: -40, depth: 'near' },
  { x: '22%', size: 20, from: -180, to: 10, rot: 30, depth: 'far' },
  { x: '78%', size: 36, from: -320, to: -10, rot: 50, depth: 'near' },
  { x: '90%', size: 22, from: -200, to: 20, rot: -20, depth: 'far' },
  { x: '64%', size: 16, from: -140, to: 30, rot: 10, depth: 'far' },
];

function Drop({ drop, progress }) {
  const y = useTransform(progress, [0, 1], [drop.from, drop.to]);
  const rotate = useTransform(progress, [0, 1], [drop.rot, 0]);
  return (
    <motion.div className={`closing__drop closing__drop--${drop.depth}`} style={{ left: drop.x, y, rotate }}>
      <Acorn size={drop.size} />
    </motion.div>
  );
}

export function ClosingScene() {
  const ref = useRef(null);
  const progress = useSceneProgress(ref, { offset: ['start end', 'center center'] });
  const rotateX = useTransform(progress, [0, 1], [18, 0]);
  const scale = useTransform(progress, [0, 1], [0.92, 1]);
  const y = useTransform(progress, [0, 1], [60, 0]);

  return (
    <section className="closing-wrap" ref={ref} aria-labelledby="closing-title">
      <motion.div className="closing" style={{ rotateX, scale, y }}>
        <div className="closing__drops" aria-hidden="true">
          {DROPS.map((drop) => (
            <Drop key={drop.x} drop={drop} progress={progress} />
          ))}
        </div>
        <p className="kicker">Start today</p>
        <h2 id="closing-title" className="closing__title">
          Small entries, kept every day, add up to a clear picture.
        </h2>
        <div className="closing__actions">
          <Link to="/signup" className="btn btn--accent closing__cta">
            Start logging
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
          <Link to="/app" className="btn btn--quiet closing__cta">
            Open your ledger
          </Link>
        </div>
        <p className="closing__signin">
          Have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.div>
    </section>
  );
}
