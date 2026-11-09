// Landing-only drawings, in the same ink-and-wash hand as the app's illustrations.
// Everything is decorative (aria-hidden); the copy beside it carries the meaning.

const ink = {
  fill: 'none',
  stroke: 'var(--ink)',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
};

export function AcornShape({ x = 0, y = 0, scale = 1, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path d="M0 12c0 10 5 17 11 20 6-3 11-10 11-20" fill="var(--clay)" />
      <path d="M-3 12c0-6 6-10 14-10s14 4 14 10z" fill="var(--kraft)" />
      <path d="M3 9.5c3-1.4 6-2 8-2M12 7.5c3 0 6 .8 8 2" strokeWidth="1.1" opacity="0.55" />
      <path d="M11 2c0-3 1-5 4-7" />
    </g>
  );
}

/** One acorn on its own, sized by its box. */
export function Acorn({ className, size = 40 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="-6 -8 34 44" {...ink}>
      <AcornShape />
    </svg>
  );
}

/** A falling oak leaf. */
export function Leaf({ className, size = 44, tone = 'var(--olive)' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" {...ink} strokeWidth="1.6">
      <path
        d="M8 40C6 26 14 10 34 6c2 6 8 10 6 18-2 6-8 6-8 10 0 6-8 10-14 8-4-1-6 0-10-2z"
        fill={tone}
        opacity="0.9"
      />
      <path d="M8 40c8-8 16-18 24-28M16 31l-2-8M22 24l8 1M26 18l-2-6" strokeWidth="1.2" />
    </svg>
  );
}

/** A squirrel peeking over an edge with an acorn in its paws. The tail sways, the eye blinks. */
export function PeekingSquirrel({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 160" {...ink} strokeWidth="2.2">
      <g className="peek__tail">
        <path
          d="M120 152c42-4 72-38 66-82-4-38-40-58-66-40-18 12-14 40 6 40-10-8-8-24 6-28 20-4 36 14 32 40-4 30-26 50-52 52z"
          fill="var(--kraft)"
        />
        <path d="M150 52c10 6 16 18 14 30M136 120c14-6 24-16 28-28" strokeWidth="1.2" opacity="0.5" />
      </g>
      <path d="M58 156c-4-32 12-60 42-62 30-2 46 26 40 62z" fill="var(--paper)" />
      <path d="M110 98c4-26-12-46-36-46-20 0-36 14-42 32-4 12 4 20 18 22 22 4 56 8 60-8z" fill="var(--paper)" />
      <path d="M86 58l8-26 13 29" fill="var(--paper)" />
      <path d="M92 44l3 8" strokeWidth="1.2" opacity="0.5" />
      <ellipse cx="86" cy="90" rx="8" ry="5" fill="var(--clay)" stroke="none" opacity="0.35" />
      <g className="peek__eye">
        <circle cx="70" cy="76" r="3.6" fill="var(--ink)" stroke="none" />
        <circle cx="71.2" cy="74.8" r="1" fill="var(--paper)" stroke="none" />
      </g>
      <circle cx="44" cy="86" r="2.6" fill="var(--ink)" stroke="none" />
      <path d="M48 94c4 2 8 2 11 0" strokeWidth="1.4" />
      <AcornShape x={64} y={104} rotate={-8} scale={1.05} />
      <path d="M56 156c0-9 6-14 13-14s13 5 13 14" fill="var(--paper)" />
      <path d="M96 156c0-9 6-14 13-14s13 5 13 14" fill="var(--paper)" />
      <path d="M63 150v6M69 148v8M75 150v6M103 150v6M109 148v8M115 150v6" strokeWidth="1.1" opacity="0.6" />
    </svg>
  );
}

/** A glass jar of acorns, the stash. `fill` is 0..1 and only changes the drawing, not layout. */
export function StashJar({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 240" {...ink} strokeWidth="2.2">
      <path d="M40 196c-10-56-2-98 26-118h88c28 20 36 62 26 118-6 30-134 30-140 0z" fill="var(--stone)" />
      <path
        d="M46 178c40 14 90 14 128 0 4 10 2 18 0 22-6 22-122 22-128 0-2-6-2-14 0-22z"
        fill="var(--clay)"
        stroke="none"
        opacity="0.22"
      />
      <AcornShape x={64} y={160} rotate={-20} scale={1.2} />
      <AcornShape x={96} y={168} rotate={12} scale={1.25} />
      <AcornShape x={128} y={160} rotate={-6} scale={1.2} />
      <AcornShape x={82} y={136} rotate={24} scale={1.15} />
      <AcornShape x={116} y={132} rotate={-16} scale={1.15} />
      <path d="M58 52h104v26H58z" fill="var(--paper)" />
      <path d="M66 64h88" strokeWidth="1.2" opacity="0.5" />
      <path d="M58 100c-8 22-10 50-6 74" stroke="var(--paper)" strokeWidth="5" opacity="0.7" />
    </svg>
  );
}

/** Hand-drawn underline that draws itself under a word. */
export function Squiggle({ className }) {
  return (
    <svg className={className} viewBox="0 0 300 20" preserveAspectRatio="none" {...ink} stroke="var(--clay)" strokeWidth="3">
      <path pathLength="1" d="M4 13c40-8 80-9 120-4s90 6 130-2c14-3 28-4 42-2" />
    </svg>
  );
}

/** A small padlock, drawn. */
export function Padlock({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 72" {...ink} strokeWidth="2.4">
      <path d="M18 32v-10c0-9 6-15 14-15s14 6 14 15v10" />
      <path d="M10 32h44c2 0 4 2 4 4v26c0 2-2 4-4 4H10c-2 0-4-2-4-4V36c0-2 2-4 4-4z" fill="var(--kraft)" />
      <path d="M32 46v8" strokeWidth="3" />
      <circle cx="32" cy="45" r="4" fill="var(--ink)" stroke="none" />
    </svg>
  );
}
