import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { useSceneProgress } from '../useScene';
import { AcornShape } from '../LandingArt';

const TOP = ['chai 20', 'rent 15,000', 'sip 5,000', 'groceries 1,240', 'auto 90', 'electricity 1,320', 'salary +62,000'];
const BOTTOM = ['lent 800', 'music 119', 'dosa 180', 'home loan emi 18,400', 'metro 40', 'books 450', 'cab 260'];

function Line({ words, x, tone }) {
  // Repeated so the row always covers the viewport while it slides.
  const items = [...words, ...words, ...words];
  return (
    <motion.div className={`ribbon__line ribbon__line--${tone}`} style={{ x }}>
      {items.map((word, i) => (
        <span key={`${word}-${i}`} className="ribbon__word">
          {word}
          <svg viewBox="-4 -8 30 44" width="16" height="20" aria-hidden="true" focusable="false" className="ribbon__acorn">
            <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <AcornShape />
            </g>
          </svg>
        </span>
      ))}
    </motion.div>
  );
}

/** Two lines of handwritten entries that slide in opposite directions as the page scrolls. */
export function EntryRibbon() {
  const ref = useRef(null);
  const progress = useSceneProgress(ref, { offset: ['start end', 'end start'], restAt: 0.5 });
  const xTop = useTransform(progress, [0, 1], ['-4%', '-30%']);
  const xBottom = useTransform(progress, [0, 1], ['-30%', '-4%']);
  return (
    <div className="ribbon" ref={ref} aria-hidden="true">
      <Line words={TOP} x={xTop} tone="ink" />
      <Line words={BOTTOM} x={xBottom} tone="soft" />
    </div>
  );
}
