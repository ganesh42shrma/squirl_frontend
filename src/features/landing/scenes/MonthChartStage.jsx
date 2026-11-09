import { CompactMonth } from './CompactScenes';
import { Fragment, useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { Sparkle } from '@phosphor-icons/react';
import { useFitScale } from '../useScene';

// Design canvas 620 × 470. A real 3D bar chart: each bar is a box (top, front, side faces)
// standing on a tilted floor. Bars grow with scaleZ, so the motion stays on the compositor.
const W = 620;
const H = 470;
const BOX = 34;
const COL_GAP = 66;
const ROW_GAP = 84;

const TYPES = [
  { key: 'spent', label: 'Spent', color: 'var(--viz-expense)' },
  { key: 'earned', label: 'Earned', color: 'var(--viz-income)' },
  { key: 'invested', label: 'Invested', color: 'var(--viz-investment)' },
  { key: 'moved', label: 'Moved', color: 'var(--viz-transfer)' },
  { key: 'lent', label: 'Lent', color: 'var(--viz-lending)' },
];

// Illustrative heights in px, not anyone's data.
const MONTHS = [
  { label: 'Sep', values: [88, 112, 44, 32, 16] },
  { label: 'Oct', values: [102, 112, 44, 22, 10] },
  { label: 'Nov', values: [76, 112, 52, 28, 6] },
];

function Bar({ color, height, left, top, progress, range }) {
  const scaleZ = useTransform(progress, range, [0.001, 1]);
  return (
    <motion.div className="mc-bar" style={{ left, top, '--c': color, scaleZ }}>
      <span className="mc-face mc-face--front" style={{ width: BOX, height, transform: `translateY(${BOX}px) rotateX(90deg)` }} />
      <span className="mc-face mc-face--side" style={{ width: height, height: BOX, transform: `translateX(${BOX}px) rotateY(-90deg)` }} />
      <span className="mc-face mc-face--top" style={{ width: BOX, height: BOX, transform: `translateZ(${height}px)` }} />
    </motion.div>
  );
}

export function MonthChartStage({ progress }) {
  const boxRef = useRef(null);
  const scale = useFitScale(boxRef, W, 1.15);

  const rotateZ = useTransform(progress, [0, 1], [-46, -26]);
  const rotateX = useTransform(progress, [0, 1], [64, 54]);
  const legendOpacity = useTransform(progress, [0.05, 0.2], [0, 1]);
  const noteOpacity = useTransform(progress, [0.66, 0.78], [0, 1]);
  const noteY = useTransform(progress, [0.66, 0.78], [30, 0]);
  const noteZ = useTransform(progress, [0.66, 0.78], [-80, 0]);
  const spark = useTransform(progress, [0.7, 0.92], [0, 1]);

  return (
    <>
    <div className="fit-box scene-desktop" ref={boxRef} style={{ height: H * scale }}>
      <div className="mc-canvas" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <motion.div className="mc-legend" style={{ opacity: legendOpacity }}>
          {TYPES.map((t) => (
            <span key={t.key}>
              <i style={{ background: t.color }} />
              {t.label}
            </span>
          ))}
        </motion.div>

        <div className="mc-scene">
          <motion.div className="mc-floor" style={{ rotateX, rotateZ }}>
            <div className="mc-grid" />
            {MONTHS.map((month, m) => (
              <Fragment key={month.label}>
                <span className="mc-month" style={{ top: 40 + m * ROW_GAP + 6 }}>
                  {month.label}
                </span>
                {month.values.map((value, t) => (
                  <Bar
                    key={TYPES[t].key}
                    color={TYPES[t].color}
                    height={value}
                    left={60 + t * COL_GAP}
                    top={40 + m * ROW_GAP}
                    progress={progress}
                    range={[0.04 + m * 0.13 + t * 0.012, 0.3 + m * 0.13 + t * 0.012]}
                  />
                ))}
              </Fragment>
            ))}
          </motion.div>
        </div>

        <motion.div className="mc-note" style={{ opacity: noteOpacity, y: noteY, z: noteZ }}>
          <span className="mc-note__label">
            <Sparkle aria-hidden="true" weight="fill" /> November highlights
          </span>
          <p>Spending is lower than October. Check the categories behind the change before treating it as a new pattern.</p>
          <svg viewBox="0 0 220 44" className="mc-note__spark" aria-hidden="true" focusable="false">
            <motion.path
              d="M2 30c18-4 26-18 44-14s22 18 40 16 24-22 42-20 20 14 38 10 26-12 52-8"
              fill="none"
              stroke="var(--viz-expense)"
              strokeWidth="2.4"
              strokeLinecap="round"
              style={{ pathLength: spark }}
            />
          </svg>
          <span className="mc-note__foot">Words from your local model. Every number computed by Squirl.</span>
        </motion.div>
      </div>
    </div>
    <CompactMonth months={MONTHS} types={TYPES} progress={progress} />
    </>
  );
}
