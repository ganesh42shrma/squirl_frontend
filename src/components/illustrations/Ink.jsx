import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.65, 0, 0.35, 1];

/**
 * One hand-drawn stroke. The outline draws itself in, then its fill fades up underneath,
 * like ink followed by a wash of colour. With reduced motion it simply appears.
 */
export function Ink({ d, fill = 'none', delay = 0, duration = 1.1, strokeWidth, className }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <path d={d} fill={fill} strokeWidth={strokeWidth} className={className} />;
  }

  return (
    <motion.path
      d={d}
      fill={fill}
      strokeWidth={strokeWidth}
      className={className}
      initial={{ pathLength: 0, fillOpacity: 0 }}
      animate={{ pathLength: 1, fillOpacity: 1 }}
      transition={{
        pathLength: { duration, delay, ease: EASE },
        fillOpacity: { duration: 0.6, delay: delay + duration * 0.7 },
      }}
    />
  );
}

/** A flat shape of colour with no outline that fades and settles into place. */
export function Wash({ d, fill, delay = 0, opacity = 1 }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <path d={d} fill={fill} stroke="none" opacity={opacity} />;

  return (
    <motion.path
      d={d}
      fill={fill}
      stroke="none"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity, scale: 1 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      transition={{ duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
