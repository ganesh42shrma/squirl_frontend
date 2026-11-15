import { useLayoutEffect, useState } from 'react';

/*
 * The landing page is built on the tasteskill kit (public/kit, copied from
 * .claude/skills/design-taste-frontend/assets). The kit expects to own the document: classes and
 * data attributes on <html> and its stylesheets. Load those only while mounted; React owns the
 * landing's behaviour so the kit's document-wide scripts and listeners never reach app routes.
 */

const FONTS =
  'https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=DM+Mono:wght@400;500&display=swap';

// Order matters (system.css first, layout.css after cards and motion), as start.mjs prints it.
const STYLESHEETS = [
  FONTS,
  '/kit/system.css',
  '/kit/ui/cards.css',
  '/kit/motion/motion.css',
  '/kit/backgrounds/backgrounds.css',
  '/kit/layout/layout.css',
  '/kit/icons/icon.css',
  '/kit/ui/base.css',
  // a plain file in public/, so Vite does not hot-reload it: in development each page load asks for it afresh
  `/landing/landing.css${import.meta.env.DEV ? `?t=${Date.now()}` : ''}`,
];

// The client's own colours (start.mjs brand: Squirl's paper, ink and clay) and the dealt type.
const BRAND_ROOT = `:root {
  --p-bg: #faf9f5; --p-surface: #f0eee6; --p-ink: #1f1e1d; --p-muted: #524f49;
  --p-accent: #a5543a; --p-accent-ink: #faf9f5; --p-action: #a5543a; --p-action-ink: #faf9f5;
  --p-inv-bg: #1f1e1d; --p-inv-surface: #2c2b29; --p-inv-ink: #faf9f5; --p-inv-muted: #b3b1ad;
  --p-inv-accent: #a5543a; --p-inv-accent-ink: #faf9f5; --p-inv-action: #a5543a; --p-inv-action-ink: #faf9f5;
  --font-display: "Instrument Sans", system-ui, sans-serif;
  --font-text: "Instrument Sans", system-ui, sans-serif;
  --font-mono: "DM Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --display-weight: 500;
  --display-tracking: -0.028em;
  --display-tracking-xl: -0.036em;
  --display-stretch: 96%;
  --ly-scale: 1.04;
}
/* React's mount node takes no box, so the page is header.nav, main and footer.closing as the kit expects */
#root { display: contents; }`;

const HTML_ATTRS = {
  lang: 'en',
  'data-type': 'software',
  'data-radius': 'sharp',
  'data-ground': 'sand',
  'data-buttons': 'pill',
  'data-motion': '',
};

const METAS = {
  'site-kind': 'software',
  'page-type': 'software',
  'theme-color': '#faf9f5',
};

const TITLE = 'Squirl: a money ledger for your Indian bank statements';
const DESCRIPTION =
  'Import SBI and Kotak PDF statements into a ledger that runs on your own computer, sorts every row and shows each month clearly.';

function addLink(href, owned) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.landingKit = '';
    link.onload = resolve;
    link.onerror = resolve; // a missing font must never keep the page blank
    document.head.append(link);
    owned.push(link);
  });
}

/** Loads the kit's styles and returns true once the page may render. */
export function useLandingKit() {
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const owned = [];
    const previous = {};
    for (const [name, value] of Object.entries(HTML_ATTRS)) {
      previous[name] = root.getAttribute(name);
      root.setAttribute(name, value);
    }
    // The landing is light only. The app's tokens switch --ink for a dark system theme unless
    // data-theme says light, and they would outrank the kit's tokens.
    previous['data-theme'] = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');

    for (const [name, content] of Object.entries(METAS)) {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.append(meta);
      owned.push(meta);
    }
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.content;
    if (description) description.content = DESCRIPTION;
    const previousTitle = document.title;
    document.title = TITLE;

    let cancelled = false;
    Promise.all(STYLESHEETS.map((href) => addLink(href, owned))).then(() => {
      if (cancelled) return;
      const style = document.createElement('style');
      style.textContent = BRAND_ROOT;
      document.head.append(style);
      owned.push(style);
      setReady(true);
    });

    return () => {
      cancelled = true;
      owned.forEach((node) => node.remove());
      for (const [name, value] of Object.entries(previous)) {
        if (value === null) root.removeAttribute(name);
        else root.setAttribute(name, value);
      }
      if (description && previousDescription !== undefined) description.content = previousDescription;
      document.title = previousTitle;
    };
  }, []);

  return ready;
}
