const STORAGE_KEY = 'squirl-guest-mode';
export const HIDDEN_AMOUNT = '••••';
const listeners = new Set();
const read = () => {
  if (!globalThis.window) return false;
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};
let enabled = read();
export const isGuestMode = () => enabled;

function notify(next) {
  if (next === enabled) return;
  enabled = next;
  listeners.forEach((listener) => listener());
}
export function setGuestMode(next) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, String(Boolean(next))); } catch { /* Still works when browser storage is blocked. */ }
  notify(Boolean(next));
}
const onStorage = (event) => {
  if (event.key === STORAGE_KEY || event.key === null) notify(read());
};
export function subscribeGuestMode(listener) {
  if (!listeners.size) globalThis.window?.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) globalThis.window?.removeEventListener('storage', onStorage);
  };
}

// Server-written highlights and user text may already contain formatted amounts.
// Dates, transaction counts and relative chart percentages remain visible.
export function maskFinancialText(value) {
  const text = String(value ?? '');
  if (!enabled) return text;
  return text.replace(/(?:₹|\bINR\b|\bRs\.?)\s*[−-]?\s*\d[\d,]*(?:\.\d+)?(?:\s*(?:lakhs?|crores?|cr|l|k)\b)?/gi, HIDDEN_AMOUNT)
    .replace(/\b\d[\d,]*(?:\.\d+)?\s*(?:lakhs?|crores?|INR|rupees)\b/gi, HIDDEN_AMOUNT);
}
