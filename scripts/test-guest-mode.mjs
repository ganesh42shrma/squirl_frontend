import assert from 'node:assert/strict';

// Synthetic browser storage only: no real profile, balances or network.
const storage = new Map();
const events = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
globalThis.window = { addEventListener: (type, handler) => events.set(type, handler), removeEventListener: (type) => events.delete(type) };
const { isGuestMode, setGuestMode, subscribeGuestMode, HIDDEN_AMOUNT, maskFinancialText } = await import('../src/lib/guestMode.js');
const { formatMoney, shortMoney, formatDate } = await import('../src/lib/format.js');
assert.equal(isGuestMode(), false);
assert.equal(formatMoney(123456.78), '₹1,23,456.78');
assert.equal(shortMoney(120000), '₹1.2L');
let changes = 0;
const unsubscribe = subscribeGuestMode(() => changes++);
setGuestMode(true);
assert.equal(isGuestMode(), true);
assert.equal(storage.get('squirl-guest-mode'), 'true');
for (const amount of [0, 99, -12000, 123456.78, 1e8]) {
  assert.equal(formatMoney(amount), HIDDEN_AMOUNT);
  assert.equal(formatMoney(amount, { rounded: true }), HIDDEN_AMOUNT);
  assert.equal(shortMoney(amount), HIDDEN_AMOUNT);
}
assert.equal(maskFinancialText('From ₹1,20,000 to Rs. 99,000; INR 12k extra.'), `From ${HIDDEN_AMOUNT} to ${HIDDEN_AMOUNT}; ${HIDDEN_AMOUNT} extra.`);
assert.equal(maskFinancialText('A balance of 2.5 lakh or 1200 INR.'), `A balance of ${HIDDEN_AMOUNT} or ${HIDDEN_AMOUNT}.`);
assert.equal(maskFinancialText('30 rows · 18% · 9 Nov 2026'), '30 rows · 18% · 9 Nov 2026');
assert.equal(formatDate('2026-11-09'), '9 Nov 2026');
const reload = await import('../src/lib/guestMode.js?reload');
assert.equal(reload.isGuestMode(), true, 'a reload starts masked before rendering');
setGuestMode(true); assert.equal(changes, 1, 'unchanged state does not rerender views');
storage.set('squirl-guest-mode', 'false'); events.get('storage')({ key: 'squirl-guest-mode' });
assert.equal(isGuestMode(), false); assert.equal(changes, 2);
assert.equal(formatMoney(123456.78), '₹1,23,456.78');
assert.equal(maskFinancialText('₹1,000'), '₹1,000');
setGuestMode(true); storage.clear(); events.get('storage')({ key: null });
assert.equal(isGuestMode(), false);
unsubscribe(); assert.equal(events.has('storage'), false);
globalThis.localStorage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
const blocked = await import('../src/lib/guestMode.js?blocked');
blocked.setGuestMode(true); assert.equal(blocked.isGuestMode(), true);
blocked.setGuestMode(false); assert.equal(blocked.isGuestMode(), false);
console.log('Passed: monetary/compact masking, numeric prose, unchanged dates/counts/percentages, restoration, reload persistence, tab synchronization and blocked browser storage.');
