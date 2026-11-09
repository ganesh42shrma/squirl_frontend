import { CompactCategories } from './CompactScenes';
import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { ArrowRight, Sparkle, Storefront } from '@phosphor-icons/react';
import { useFitScale } from '../useScene';

// Design canvas 600 × 440. A drum of real default categories turns to file each merchant.
const W = 600;
const H = 440;
const STEP_DEG = 30;
const RADIUS = 168;

const FACES = [
  { name: 'Groceries', tone: 'clay' },
  { name: 'Dining Out', tone: 'clay' },
  { name: 'Cab & Auto', tone: 'clay' },
  { name: 'Society Maintenance', tone: 'clay' },
  { name: 'Electricity', tone: 'clay' },
  { name: 'Mobile Recharge', tone: 'clay' },
  { name: 'Medicines', tone: 'clay' },
  { name: 'Streaming (OTT)', tone: 'clay' },
  { name: 'SIP', tone: 'sky' },
  { name: 'Salary', tone: 'olive' },
  { name: 'Sent to Parents', tone: 'clay' },
  { name: 'Fixed Deposit', tone: 'sky' },
];

const MERCHANTS = [
  { raw: 'UPI/BIRYANI HOUSE/4471', note: 'You picked a category', face: 1 },
  { raw: 'NACH/GREENWOOD SOC/NOV', note: 'Remembered from last month', face: 3 },
  { raw: 'POS/CITY PHARMACY 22', note: 'Categorized by your local model', face: 6, suggested: true },
];

// `range` is where the card comes in and goes out, always inside 0..1 (the transforms may run
// on a native scroll timeline, which rejects offsets outside that span). `enter`/`leave` false
// skip that half, so the first card starts in place and the last one stays.
function Merchant({ merchant, progress, range, enter = true, leave = true }) {
  const [a, b, c, d] = range;
  const input = [...(enter ? [a, b] : [b]), ...(leave ? [c, d] : [c])];
  const pick = (from, rest, to) => [...(enter ? [from, rest] : [rest]), ...(leave ? [rest, to] : [rest])];
  const opacity = useTransform(progress, input, pick(0, 1, 0));
  const y = useTransform(progress, input, pick(24, 0, -24));
  const rotateX = useTransform(progress, input, pick(-40, 0, 40));
  return (
    <motion.div className="cd-merchant" style={{ opacity, y, rotateX }}>
      <span className="cd-merchant__icon">
        <Storefront aria-hidden="true" />
      </span>
      <div>
        <code>{merchant.raw}</code>
        <span className={`cd-merchant__note${merchant.suggested ? ' is-suggested' : ''}`}>
          {merchant.suggested && <Sparkle aria-hidden="true" weight="fill" />}
          {merchant.note}
        </span>
      </div>
    </motion.div>
  );
}

export function CategoryDrumStage({ progress }) {
  const boxRef = useRef(null);
  const scale = useFitScale(boxRef, W, 1.25);

  const [m0, m1, m2] = MERCHANTS.map((m) => m.face * STEP_DEG);
  const drum = useTransform(progress, [0, 0.18, 0.34, 0.5, 0.66, 0.84, 1], [m0 - 120, m0, m0, m1, m1, m2, m2]);
  const tilt = useTransform(progress, [0, 1], [-8, 8]);

  return (
    <>
    <div className="fit-box scene-desktop" ref={boxRef} style={{ height: H * scale }}>
      <div className="cd-canvas" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <div className="cd-merchants">
          <Merchant merchant={MERCHANTS[0]} progress={progress} range={[0, 0, 0.3, 0.38]} enter={false} />
          <Merchant merchant={MERCHANTS[1]} progress={progress} range={[0.32, 0.42, 0.62, 0.7]} />
          <Merchant merchant={MERCHANTS[2]} progress={progress} range={[0.64, 0.74, 1, 1]} leave={false} />
        </div>

        <ArrowRight className="cd-arrow" aria-hidden="true" weight="bold" />

        <motion.div className="cd-drum-wrap" style={{ rotateY: tilt }}>
          <div className="cd-slot" />
          <motion.div className="cd-drum" style={{ rotateX: drum }}>
            {FACES.map((face, i) => (
              <div
                key={face.name}
                className={`cd-face cat-chip--${face.tone}`}
                style={{ transform: `rotateX(${-i * STEP_DEG}deg) translateZ(${RADIUS}px)` }}
              >
                <span className="cd-face__dot" />
                {face.name}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
    <CompactCategories merchants={MERCHANTS} faces={FACES} progress={progress} />
    </>
  );
}
