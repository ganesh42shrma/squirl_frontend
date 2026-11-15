/*
 * The journey's ledger: the chapters of the page and the timeline of the 3D scene, in one place and
 * with no three.js in it, so the page can read it without loading the scene.
 *
 * The page is one tall section. A stage is pinned to the screen (position: sticky) and the chapters
 * scroll over it. Progress p runs 0..1 over the section's travel (its height less one screen).
 * Each chapter's height `h` is in screens, and every beat of the scene is written as a point inside
 * a chapter with `at(id, f)` (f = 0 the chapter's top reaching the top of the screen, f = 1 its end),
 * so changing a height re-times the scene with it and the words always meet their action.
 *
 * Kinds of chapter:
 *   text    words that stick 34% down the screen while the chapter scrolls by
 *   hero    the same, holding the page's h1 and buttons
 *   spacer  empty scroll: the camera is travelling, or a panel in the laptop's screen is on show
 */

const clamp01 = (n) => Math.min(1, Math.max(0, n));

export const CHAPTERS = [
  { id: 'intro', h: 1.3, kind: 'hero', label: 'Squirl' },
  {
    id: 'imports', h: 2.2, kind: 'text', label: 'Imports',
    title: 'Reads your bank’s PDFs',
    line: 'SBI and Kotak e-statements, password and all.',
    points: ['Duplicates are skipped', 'Any import can be undone'],
  },
  {
    id: 'sorting', h: 2.4, kind: 'text', label: 'Categories',
    title: 'Sorts every row',
    line: 'Five kinds of money, never mixed.',
    points: ['Spent', 'Earned', 'Invested', 'Moved', 'Lent'],
    kinds: true,
  },
  {
    id: 'machine', h: 2.2, kind: 'text', label: 'Your machine',
    title: 'Runs on your own machine',
    line: 'No cloud account. No sync service.',
  },
  {
    id: 'plug', h: 2.2, kind: 'text', label: 'Plugged in',
    title: 'Plugged in, charged up',
    line: 'Sorting and highlights run on your hardware.',
  },
  {
    id: 'private', h: 1.8, kind: 'text', label: 'Private',
    title: 'Your money stays put',
    line: 'In a database only you can open.',
  },
  { id: 'zoom', h: 1.5, kind: 'spacer' },
  { id: 'months', h: 1.5, kind: 'spacer', label: 'Months' },
  { id: 'faq', h: 1.5, kind: 'spacer', label: 'Questions' },
  { id: 'leave', h: 1.5, kind: 'spacer' },
  { id: 'start', h: 1.6, kind: 'spacer', label: 'Start' },
];

export const TOTAL = CHAPTERS.reduce((sum, c) => sum + c.h, 0);
export const TRAVEL = TOTAL - 1;

const START = {};
const HEIGHT = {};
{
  let y = 0;
  for (const c of CHAPTERS) {
    START[c.id] = y;
    HEIGHT[c.id] = c.h;
    y += c.h;
  }
}

/** Progress at a point inside a chapter: f = 0 its top at the top of the screen, f = 1 its end. */
export const at = (id, f = 0) => clamp01((START[id] + f * HEIGHT[id]) / TRAVEL);

/** The chapter on screen at progress p (the last one whose top has reached the top of the screen). */
export function chapterAt(p) {
  let current = CHAPTERS[0].id;
  for (const c of CHAPTERS) if (p >= at(c.id) - 0.0005) current = c.id;
  return current;
}

/*
 * The scene's timeline. Pairs are [from, to]; `charge` is [rise, full, hold, gone].
 *
 *   intro     statement pages drift in the dark, the drive's parts hang apart
 *   imports   the pages gather into a stack; their rows lift off and stream out
 *   sorting   the rows take the colours of the five kinds and settle into five columns
 *   machine   the columns shrink onto the drive's board and the drive closes round them
 *   plug      the drive flies to the laptop and slides in; charge arcs round the port
 *   private   the screen wakes with the ledger; the camera pulls back
 *   zoom      the camera turns square to the screen and flies in until it fills the view
 *   months    the screen is the page: the months panel
 *   faq       the screen turns to the questions panel
 *   leave     the camera pulls out; the lid closes on the drive's glow
 *   start     the closed laptop turns; the last words and the button
 */
export const T = {
  // statement pages
  pagesGather: [at('intro', 0.55), at('imports', 0.28)],
  rowsLift: [at('imports', 0.2), at('imports', 0.95)],
  pagesLeave: [at('imports', 0.7), at('sorting', 0.15)],
  // rows into the five columns, then onto the board
  rowsSort: [at('sorting', 0.02), at('sorting', 0.78)],
  rowsStore: [at('machine', 0.0), at('machine', 0.42)],
  // the drive's parts lock, each over `partDur`
  parts: {
    board: at('sorting', 0.72),
    connector: at('sorting', 0.9),
    bottom: at('machine', 0.24),
    top: at('machine', 0.33),
    loop: at('machine', 0.36),
  },
  partDur: 0.75 / TRAVEL,
  travel: [at('machine', 0.72), at('plug', 0.2)],
  insert: [at('plug', 0.2), at('plug', 0.32)],
  charge: [at('plug', 0.28), at('plug', 0.36), at('plug', 0.62), at('plug', 0.8)],
  sparks: [at('plug', 0.26), at('plug', 0.72)],
  led: [at('plug', 0.34), at('plug', 0.46)],
  wake: [at('plug', 0.72), at('private', 0.25)],
  // into the screen and the panels that live there
  zoom: [at('zoom', 0.05), at('zoom', 0.9)],
  paper: [at('zoom', 0.74), at('zoom', 0.9)],
  months: [at('zoom', 0.9), at('months', 0)],
  toFaq: [at('months', 0.78), at('faq', 0)],
  // out again
  panelsOut: [at('faq', 0.72), at('faq', 0.96)],
  paperOut: [at('faq', 0.96), at('leave', 0.2)],
  unzoom: [at('faq', 0.95), at('leave', 0.62)],
  lid: [at('leave', 0.45), at('start', 0.05)],
  outro: [at('leave', 0.7), at('start', 0)],
};

export const KINDS = [
  { id: 'spent', label: 'Spent', color: '#dc6a4a' },
  { id: 'earned', label: 'Earned', color: '#5f9c5a' },
  { id: 'invested', label: 'Invested', color: '#3f77c9' },
  { id: 'moved', label: 'Moved', color: '#d9ae2c' },
  { id: 'lent', label: 'Lent', color: '#a68be0' },
];
