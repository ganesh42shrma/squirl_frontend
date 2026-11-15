import { useSyncExternalStore } from 'react';

// A subscription to one media query that never throws: with no window or no matchMedia
// (SSR, tests, locked-down webviews) it reports `false`.
function subscribeTo(query) {
  return (onChange) => {
    let mql;
    try { mql = window.matchMedia(query); } catch { return () => {}; }
    // Safari < 14 only has addListener/removeListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener?.(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener?.(onChange);
    };
  };
}

function snapshotOf(query) {
  return () => {
    try { return window.matchMedia(query).matches; } catch { return false; }
  };
}

const cache = new Map();
export function useMediaQuery(query) {
  if (!cache.has(query)) cache.set(query, { subscribe: subscribeTo(query), snapshot: snapshotOf(query) });
  const { subscribe, snapshot } = cache.get(query);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

// Layout decisions (tab bar, card list, bottom sheets) use this. A narrow window, or a touch
// device up to tablet width, gets the mobile layout; desktop windows never do.
export const MOBILE_QUERY = '(max-width: 768px), (pointer: coarse) and (max-width: 1024px)';
export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);

// True when launched from the home screen as an installed PWA. Informational only:
// do not use it to choose a layout, because the same phone in a browser tab needs the same UI.
export const useIsStandalone = () => useMediaQuery('(display-mode: standalone)');
