// Settings forms keep a draft next to what the server last saved. These helpers say whether the two
// differ and what the status line should read, so every settings page tells the same story.

// Key order never matters to a form, so compare with sorted keys.
const stable = (value) => JSON.stringify(value, (_, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
  : v));

export const sameSettings = (a, b) => stable(a) === stable(b);

/** True only when both sides are loaded and differ; nothing to save before the saved copy arrives. */
export const hasChanges = (draft, saved) => draft != null && saved != null && !sameSettings(draft, saved);

/** Options older devices never stored behave as "on"; fill them in so an untouched form isn't "changed". */
export const NOTIFICATION_DEFAULTS = Object.freeze({ smsPayments: true, captures: true, details: true });
export const normalisePreferences = (preferences) => (preferences ? { ...NOTIFICATION_DEFAULTS, ...preferences } : null);

/** 'saving' while a request runs, then 'error' if it failed, 'dirty' with edits waiting, else 'saved'. */
export function saveState({ dirty, pending = false, error = false }) {
  if (pending) return 'saving';
  if (error) return 'error';
  return dirty ? 'dirty' : 'saved';
}

export const SAVE_TEXT = {
  saving: 'Saving…',
  error: 'Not saved. Your changes are still here.',
  dirty: 'Unsaved changes',
  saved: 'All changes saved',
};
