import { CompactStatement } from './CompactScenes';
import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import { ArrowCounterClockwise, FilePdf } from '@phosphor-icons/react';
import { useFitScale } from '../useScene';

// Design canvas: 640 × 460. Rows sit at their ledger position and start offset onto the sheet.
const W = 680;
const H = 460;
const ROW_TOP = 104;
const ROW_GAP = 46;
const SHEET_ROW_TOP = 112;
const SHEET_ROW_GAP = 38;
const DX = 36 - 368; // sheet column left − ledger column left

const ROWS = [
  { date: '02 Oct', what: 'UPI · Dosa Corner', amt: '₹180', cat: 'Dining Out', tone: 'clay' },
  { date: '04 Oct', what: 'Electricity bill', amt: '₹1,320', cat: 'Bills', tone: 'clay' },
  { date: '05 Oct', what: 'NACH · Home loan EMI', amt: '₹18,400', cat: 'EMI', tone: 'kraft' },
  { date: '07 Oct', what: 'Chai at the corner stall', amt: '₹20', cat: '', tone: 'clay', duplicate: true },
  { date: '10 Oct', what: 'SIP auto-debit', amt: '₹5,000', cat: 'Investment', tone: 'sky' },
  { date: '12 Oct', what: 'Lent to a friend', amt: '₹800', cat: 'Lent', tone: 'heather' },
];

function Row({ row, index, progress }) {
  const start = 0.24 + index * 0.045;
  const end = start + 0.16;
  const mid = (start + end) / 2;
  const dy = SHEET_ROW_TOP + index * SHEET_ROW_GAP - (ROW_TOP + index * ROW_GAP);

  const x = useTransform(progress, [start, end], [DX, 0]);
  const y = useTransform(progress, [start, end], [dy, 0]);
  const z = useTransform(progress, [start, mid, end], [0, 90, 0]);
  const rotateZ = useTransform(progress, [start, end], [-3, 0]);
  const rotateX = useTransform(progress, [start, mid, end], [0, -18, 0]);
  const shadow = useTransform(progress, [start, mid, end], [0, 1, 0.35]);
  const card = useTransform(progress, [start, end], [0, 1]);

  const chipStart = 0.6 + index * 0.03;
  const chipScale = useTransform(progress, [chipStart, chipStart + 0.08], [0, 1]);
  const chipOpacity = useTransform(progress, [chipStart, chipStart + 0.05], [0, 1]);

  const dupStrike = useTransform(progress, [0.54, 0.62], [0, 1]);
  const opacity = useTransform(
    progress,
    row.duplicate ? [start - 0.03, start, 0.54, 0.64] : [start - 0.03, start],
    row.duplicate ? [0, 1, 1, 0.5] : [0, 1],
  );
  const dupTag = useTransform(progress, [0.58, 0.66], [0, 1]);

  return (
    <motion.div
      className={`st-row st-row--${row.tone}${row.duplicate ? ' st-row--dup' : ''}`}
      style={{ top: ROW_TOP + index * ROW_GAP, x, y, z, rotateZ, rotateX, opacity }}
    >
      <motion.span className="st-row__card" style={{ opacity: card }} />
      <motion.span className="st-row__shadow" style={{ opacity: shadow }} />
      <span className="st-row__date">{row.date}</span>
      <span className="st-row__what">{row.what}</span>
      {row.duplicate ? (
        <motion.span className="st-row__tag" style={{ opacity: dupTag }}>
          Previously imported · skipped
        </motion.span>
      ) : (
        <motion.span className={`cat-chip cat-chip--${row.tone}`} style={{ scale: chipScale, opacity: chipOpacity }}>
          {row.cat}
        </motion.span>
      )}
      <span className="st-row__amt">{row.amt}</span>
      {row.duplicate && <motion.span className="st-row__strike" style={{ scaleX: dupStrike }} />}
    </motion.div>
  );
}

export function StatementStage({ progress }) {
  const boxRef = useRef(null);
  const scale = useFitScale(boxRef, W, 1.15);

  // The PDF lands: it falls in tilted, like a page dropped on a desk, then lies flat facing you.
  const sheetRotateX = useTransform(progress, [0, 0.2], [62, 0]);
  const sheetRotateZ = useTransform(progress, [0, 0.2], [-16, -3]);
  const sheetY = useTransform(progress, [0, 0.2], [-120, 0]);
  const sheetZ = useTransform(progress, [0, 0.2], [180, 0]);
  const sheetOpacity = useTransform(progress, [0, 0.06], [0.2, 1]);
  const dropzone = useTransform(progress, [0.08, 0.2], [1, 0]);
  const sheetLines = useTransform(progress, [0.26, 0.56], [1, 0.25]);

  const ledgerOpacity = useTransform(progress, [0.14, 0.26], [0, 1]);
  const ledgerX = useTransform(progress, [0.14, 0.26], [40, 0]);
  const ledgerRotateY = useTransform(progress, [0.14, 0.3], [-24, 0]);

  const summary = useTransform(progress, [0.8, 0.9], [0, 1]);
  const summaryY = useTransform(progress, [0.8, 0.9], [20, 0]);

  return (
    <>
    <div className="fit-box scene-desktop" ref={boxRef} style={{ height: H * scale }}>
      <div className="st-canvas" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <motion.div className="st-dropzone" style={{ opacity: dropzone }}>
          <FilePdf aria-hidden="true" /> Drop a statement PDF
        </motion.div>

        <motion.div
          className="st-sheet"
          style={{ rotateX: sheetRotateX, rotateZ: sheetRotateZ, y: sheetY, z: sheetZ, opacity: sheetOpacity }}
        >
          <div className="st-sheet__head">
            <span className="paper-sheet__bank">SBI</span>
            <span>Account statement · Oct</span>
          </div>
          <motion.div className="st-sheet__lines" style={{ opacity: sheetLines }}>
            {ROWS.map((row, i) => (
              <div key={row.what} className="st-sheet__line" style={{ top: SHEET_ROW_TOP - 40 + i * SHEET_ROW_GAP }}>
                <span>{row.date}</span>
                <span className="st-sheet__bar" style={{ width: `${46 + ((i * 17) % 30)}%` }} />
                <span>{row.amt}</span>
              </div>
            ))}
          </motion.div>
          <span className="paper-sheet__fold" />
        </motion.div>

        <motion.div className="st-ledger" style={{ opacity: ledgerOpacity, x: ledgerX, rotateY: ledgerRotateY }}>
          <div className="st-ledger__head">
            <strong>Ledger</strong>
            <span>October</span>
          </div>
        </motion.div>

        <div className="st-rows">
          {ROWS.map((row, i) => (
            <Row key={row.what} row={row} index={i} progress={progress} />
          ))}
        </div>

        <motion.div className="st-summary" style={{ opacity: summary, y: summaryY }}>
          <span>
            <strong>5 new</strong> · 1 skipped
          </span>
          <span className="st-summary__undo">
            <ArrowCounterClockwise aria-hidden="true" weight="bold" /> Undo import
          </span>
        </motion.div>
      </div>
    </div>
    <CompactStatement rows={ROWS} />
    </>
  );
}
