import { motion, useReducedMotion } from 'motion/react';

/**
 * Words settle in one after another, coming out of a soft blur (inspired by React Bits' BlurText).
 * The full sentence stays in the DOM for screen readers; the animated words are hidden from them.
 */
export function BlurText({ text, as: Tag = 'h1', className, delay = 0, stagger = 0.08 }) {
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  if (reduceMotion) return <Tag className={className}>{text}</Tag>;

  return (
    <Tag className={className}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
            initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * stagger, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </span>
    </Tag>
  );
}
