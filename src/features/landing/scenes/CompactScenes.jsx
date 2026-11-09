import { motion, useTransform } from 'motion/react';
import { ArrowRight, CheckCircle, FilePdf, Sparkle } from '@phosphor-icons/react';

// Small screens get their own fluid compositions. Text is never scaled with a canvas.
export function CompactStatement({ rows }) {
  return <div className="compact-scene compact-statement">
    <div className="compact-scene__head"><FilePdf size={22} /><span>SBI statement<small>Illustrative October entries</small></span></div>
    <ul>{rows.map((row) => <li key={row.what} className={row.duplicate ? 'is-duplicate' : ''}>
      <div><span className="compact-statement__name">{row.what}</span><small>{row.duplicate ? 'Previously imported · skipped' : row.cat}</small></div><strong>{row.amt}</strong>
    </li>)}</ul>
    <div className="compact-scene__foot"><CheckCircle size={18} weight="fill" /><strong>5 new · 1 already imported</strong><span>Undo import</span></div>
  </div>;
}

export function CompactCategories({ merchants, faces, progress }) {
  const y = useTransform(progress, [0, 1], [8, -4]);
  return <motion.div className="compact-scene compact-categories" style={{ y }}>
    {merchants.map((merchant) => <div className="compact-category" key={merchant.raw}>
      <code>{merchant.raw}</code><span className="compact-category__route"><ArrowRight size={16} /><strong>{faces[merchant.face].name}</strong></span>
      <small>{merchant.suggested && <Sparkle size={14} weight="fill" />}{merchant.note}</small>
    </div>)}
  </motion.div>;
}

export function CompactMonth({ months, types, progress }) {
  const scaleY = useTransform(progress, [0.04, 0.65], [0.08, 1]);
  return <div className="compact-scene compact-month">
    <div className="compact-month__legend">{types.map((type) => <span key={type.key}><i style={{ background: type.color }} />{type.label}</span>)}</div>
    <div className="compact-month__chart">{months.map((month) => <div key={month.label} className="compact-month__group">
      <div className="compact-month__bars">{month.values.map((height, index) => <motion.span key={types[index].key} style={{ height, background: types[index].color, scaleY }} />)}</div><strong>{month.label}</strong>
    </div>)}</div>
    <div className="compact-month__note"><Sparkle size={16} /><p>Spending is lower than October. Check the categories behind the change before treating it as a new pattern.</p><small>Illustrative highlights · local model</small></div>
  </div>;
}
