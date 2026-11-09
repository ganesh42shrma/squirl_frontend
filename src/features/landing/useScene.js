import { useEffect, useState } from 'react';
import { useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';

/**
 * Scroll progress (0 → 1) of a scene through the viewport. With reduced motion it is pinned
 * at `restAt` (default 1, the finished picture), so every scene shows its final state, still.
 */
export function useSceneProgress(target, { offset = ['start start', 'end end'], restAt = 1, staticScene = false } = {}) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target, offset });
  const progress = useDetachedProgress(scrollYProgress);
  const still = useMotionValue(restAt);
  return reduceMotion || staticScene ? still : progress;
}

/**
 * Motion can hand scroll-linked opacity to a native ViewTimeline. Our keyframe ranges sit inside
 * 0..1 (a fade from 0.08 to 0.2, say), and outside such a range the native animation falls back
 * to the element's base opacity, so faded things reappear. A function transform keeps the value
 * on motion's own frame loop, where ranges clamp as written.
 */
export function useDetachedProgress(scrollProgress) {
  return useTransform(scrollProgress, (v) => v);
}

/**
 * Fits a fixed-size design (designWidth × designHeight px) into its container by scaling,
 * so the hand-placed 3D scenes keep their geometry on any screen.
 */
export function useFitScale(ref, designWidth, max = 1) {
  const [scale, setScale] = useState(max);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(max, width / designWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, designWidth, max]);
  return scale;
}

/** True on devices with a fine pointer that can hover (desktop mice and trackpads). */
export function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFine(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return fine;
}

/** Short phone and landscape viewports cannot fit a pinned chapter and its readable illustration. */
export function useUnpinnedLayout() {
  const query = '(max-height: 560px) and (orientation: landscape), (max-width: 600px) and (max-height: 700px)';
  const [short, setShort] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setShort(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return short;
}
