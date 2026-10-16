import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * Counts from the previous value to the new one whenever `value` changes
 * (inspired by React Bits' CountUp). Renders formatted text via `format`.
 */
export function CountUp({ value, format = String, duration = 0.9, className }) {
  const ref = useRef(null);
  const previous = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      node.textContent = format(value);
      previous.current = value;
      return;
    }

    const controls = animate(previous.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
