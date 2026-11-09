import { useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion } from 'motion/react';
import { useSceneProgress, useUnpinnedLayout } from '../useScene';

/**
 * A scroll chapter: a tall section whose stage stays pinned (position: sticky) while you scroll
 * past it, and whose steps light up in turn. Scrolling is never taken over: the page moves at its
 * normal speed, and the stage only reads how far through the chapter you are.
 *
 * All step text is always in the document. With reduced motion the chapter collapses to
 * normal height, every step is shown at once, and the stage renders its finished state.
 */
export function ScrollChapter({ id, kicker, title, intro, steps, length = 320, flip = false, children, className = '' }) {
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const unpinned = useUnpinnedLayout();
  const staticScene = reduceMotion || unpinned;
  const progress = useSceneProgress(ref, { staticScene });
  const [active, setActive] = useState(reduceMotion ? steps.length - 1 : 0);

  useMotionValueEvent(progress, 'change', (p) => {
    const next = Math.min(steps.length - 1, Math.max(0, Math.floor(p * steps.length * 0.999)));
    setActive((current) => (current === next ? current : next));
  });

  return (
    <section
      id={id}
      ref={ref}
      className={`chapter${flip ? ' chapter--flip' : ''}${staticScene ? ' is-still' : ''} ${className}`}
      style={{ '--chapter-length': `${length}vh` }}
      aria-labelledby={`${id}-title`}
    >
      <div className="chapter__pin">
        <div className="chapter__text">
          <p className="kicker">{kicker}</p>
          <h2 id={`${id}-title`} className="chapter__title">
            {title}
          </h2>
          {intro && <p className="chapter__intro">{intro}</p>}
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.title} className={`step${i === active ? ' is-active' : ''}${i < active ? ' is-done' : ''}`}>
                <span className="step__num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="step__title">{step.title}</h3>
                  <p className="step__body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="chapter__meter" aria-hidden="true">
            {steps.map((step, i) => (
              <span key={step.title} className={i <= active ? 'is-on' : ''} />
            ))}
          </div>
        </div>
        <div className="chapter__stage" aria-hidden="true">
          {children(progress)}
        </div>
      </div>
    </section>
  );
}
