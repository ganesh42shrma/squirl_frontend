import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, formatMoney, shortMoney } from '../../lib/format';

const PAD = { top: 16, right: 64, bottom: 28, left: 52 };

// Draw at the real pixel width, so text stays 11px on a phone and on a wide screen alike.
function useWidth(ref) {
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const time = (d) => Date.parse(String(d).slice(0, 10));

// Direct labels at the line ends, pushed apart so they never overlap where the lines meet.
function EndLabels({ x, price, saved }) {
  const gap = 15;
  let p = price;
  let s = saved;
  if (Math.abs(p - s) < gap) {
    const mid = (p + s) / 2;
    const priceAbove = p <= s;
    p = mid + (priceAbove ? -gap / 2 : gap / 2);
    s = mid + (priceAbove ? gap / 2 : -gap / 2);
  }
  return (
    <>
      <text className="goal-chart__end" x={x} y={p} dy="0.32em">Price</text>
      <text className="goal-chart__end" x={x} y={s} dy="0.32em">Savings</text>
    </>
  );
}

/**
 * Savings against the rising price. Solid green: saved so far. Dashed green: where the plan takes
 * the savings. Clay: the price with inflation. Where the green reaches the clay is the buy date.
 */
export function GoalChart({ history = [], projection = [], label = 'Savings against the price' }) {
  const [hover, setHover] = useState(null);
  const plotRef = useRef(null);
  const W = Math.max(useWidth(plotRef), 280);
  const H = Math.round(Math.min(Math.max(W * 0.36, 190), 300));

  const model = useMemo(() => {
    const points = [
      ...history.map((p) => ({ t: time(p.date), date: p.date, saved: p.saved, kind: 'history' })),
      ...projection.map((p) => ({ t: time(p.date), date: p.date, saved: p.saved, price: p.price, kind: 'plan' })),
    ];
    if (!points.length) return null;
    const t0 = Math.min(...points.map((p) => p.t));
    const t1 = Math.max(...points.map((p) => p.t), t0 + 86_400_000);
    const top = Math.max(...points.map((p) => Math.max(p.saved || 0, p.price || 0)), 1) * 1.08;
    const x = (t) => PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
    const y = (v) => H - PAD.bottom - (Math.max(v, 0) / top) * (H - PAD.top - PAD.bottom);
    const line = (list, key) => list.map((p, i) => `${i ? 'L' : 'M'}${x(time(p.date)).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
    const years = [];
    for (let yr = new Date(t0).getUTCFullYear() + 1; Date.UTC(yr, 0, 1) <= t1; yr += 1) years.push(yr);
    const step = Math.ceil(years.length / Math.max(2, Math.floor(W / 110))) || 1;
    return { points, x, y, line, ticks, years: years.filter((_, i) => i % step === 0) };
  }, [history, projection, W, H]);

  if (!model) return null;
  const { x, y, line, ticks, years, points } = model;
  const lastPlan = projection.at(-1);

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = null;
    for (const p of points) if (!best || Math.abs(x(p.t) - px) < Math.abs(x(best.t) - px)) best = p;
    setHover(best);
  };

  return (
    <figure className="goal-chart">
      <figcaption className="goal-chart__legend">
        {history.length > 1 && <span><i className="is-saved" aria-hidden="true" /> Saved so far</span>}
        {projection.length > 1 && <span><i className="is-plan" aria-hidden="true" /> Where the plan takes it</span>}
        {projection.length > 1 && <span><i className="is-price" aria-hidden="true" /> Price with inflation</span>}
      </figcaption>
      <div className="goal-chart__plot" ref={plotRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v} className="goal-chart__grid">
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end">{shortMoney(v)}</text>
            </g>
          ))}
          {years.map((yr) => (
            <text key={yr} className="goal-chart__year" x={x(Date.UTC(yr, 0, 1))} y={H - 8} textAnchor="middle">{yr}</text>
          ))}
          {projection.length > 1 && <path className="goal-chart__price" d={line(projection, 'price')} />}
          {projection.length > 1 && <path className="goal-chart__plan" d={line(projection, 'saved')} />}
          {history.length > 1 && <path className="goal-chart__saved" d={line(history, 'saved')} />}
          {lastPlan && <EndLabels x={x(time(lastPlan.date)) + 8} price={y(lastPlan.price)} saved={y(lastPlan.saved)} />}
          {hover && (
            <g className="goal-chart__hover">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.top} y2={H - PAD.bottom} />
              <circle className="is-saved" cx={x(hover.t)} cy={y(hover.saved)} r="4.5" />
              {hover.price != null && <circle className="is-price" cx={x(hover.t)} cy={y(hover.price)} r="4.5" />}
            </g>
          )}
        </svg>
        {hover && (
          <div className="goal-chart__tip" style={{ left: `${Math.min(Math.max((x(hover.t) / W) * 100, 14), 86)}%` }} role="status">
            <strong>{formatDate(hover.date)}</strong>
            <span>{hover.kind === 'history' ? 'Saved' : 'Savings (plan)'}: {formatMoney(hover.saved, { rounded: true })}</span>
            {hover.price != null && <span>Price: {formatMoney(hover.price, { rounded: true })}</span>}
          </div>
        )}
      </div>
      <details className="goal-chart__table">
        <summary>Show as a table</summary>
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Savings</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={`${p.kind}-${p.date}`}>
                  <th scope="row">{formatDate(p.date)}{p.kind === 'plan' ? ' (plan)' : ''}</th>
                  <td className="num">{formatMoney(p.saved, { rounded: true })}</td>
                  <td className="num">{p.price != null ? formatMoney(p.price, { rounded: true }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
