// Small static spot drawings in the same ink-and-wash style as the hero.

const inkProps = {
  fill: 'none',
  stroke: 'var(--ink)',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function Acorn({ x, y, scale = 1, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 12c0 10 5 17 11 20 6-3 11-10 11-20" fill="var(--clay)" />
      <path d="M-3 12c0-6 6-10 14-10s14 4 14 10z" fill="var(--kraft)" />
      <path d="M11 2c0-3 1-5 4-7" />
    </g>
  );
}

/** A glass jar with one lonely acorn: used when there's nothing to show yet. */
export function EmptyJar({ size = 112 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" {...inkProps}>
      <path d="M26 92c-6-30 0-50 14-58h40c14 8 20 28 14 58-4 14-64 14-68 0z" fill="var(--stone)" />
      <path d="M36 22h48v12H36z" fill="var(--paper)" />
      <path d="M40 46c-4 10-4 22-2 32" strokeWidth="1.4" stroke="var(--ink-faint)" />
      <Acorn x={52} y={66} rotate={-14} />
    </svg>
  );
}

/** A ruled page with a pencil: logging rows. */
export function LogSketch({ size = 120 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 150 120" {...inkProps}>
      <path d="M30 22c30-6 64-6 92 2l-6 82c-28-6-58-6-90 0z" fill="var(--paper)" />
      <path d="M40 46c22-4 48-4 70 0M38 64c22-4 50-4 72 0M36 82c22-4 50-4 72 0" strokeWidth="1.4" />
      <path d="M38 46h0M36 64h0" strokeWidth="5" stroke="var(--clay)" />
      <path d="M104 96 132 28l10 4-28 68-12 6z" fill="var(--kraft)" />
      <path d="M132 28l3-7 10 4-3 7" />
    </svg>
  );
}

/** A bank statement folding into the stash. */
export function StatementSketch({ size = 120 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 150 120" {...inkProps}>
      <path d="M86 70c26-10 52 4 54 26 2 16-20 22-46 20-22-2-34-30-8-46z" fill="var(--sky)" stroke="none" opacity="0.55" />
      <path d="M28 12h56l16 16v64H28z" fill="var(--paper)" />
      <path d="M84 12v16h16" />
      <path d="M40 40h44M40 52h44M40 64h30" strokeWidth="1.4" />
      <path d="M40 78h20" strokeWidth="1.4" stroke="var(--clay)" />
      <Acorn x={104} y={78} rotate={10} scale={1.1} />
      <path d="M92 58c8-6 16-6 22 2" strokeDasharray="3 5" />
    </svg>
  );
}

/** Acorns growing in size along a line: small entries adding up. */
export function GrowingAcorns({ size = 240 }) {
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 240 120" {...inkProps}>
      <path d="M12 104c70-4 144-4 216 0" />
      <Acorn x={22} y={78} scale={0.7} rotate={-8} />
      <Acorn x={62} y={66} scale={1} rotate={6} />
      <Acorn x={112} y={48} scale={1.4} rotate={-4} />
      <Acorn x={176} y={22} scale={2} rotate={8} />
    </svg>
  );
}

/** Five ink bars of different heights: the month at a glance. */
export function MonthSketch({ size = 120 }) {
  const bars = [
    { x: 30, h: 50, c: 'var(--clay)' },
    { x: 52, h: 76, c: 'var(--olive)' },
    { x: 74, h: 38, c: 'var(--sky)' },
    { x: 96, h: 24, c: 'var(--kraft)' },
    { x: 118, h: 14, c: 'var(--heather)' },
  ];
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 150 120" {...inkProps}>
      <path d="M20 102c40-2 80-2 116 0" />
      {bars.map((b) => (
        <path key={b.x} d={`M${b.x} 100v-${b.h}c0-3 2-5 5-5h6c3 0 5 2 5 5v${b.h}`} fill={b.c} />
      ))}
    </svg>
  );
}
