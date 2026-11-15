import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('public/manifest.webmanifest', root), 'utf8'));
assert.equal(manifest.start_url, '/app'); assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const png = await readFile(new URL(`public${icon.src}`, root));
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
}
const handlers = {};
const cached = new Map();
const notices = [];
const opened = [];
const replies = [], messages = [];
let networkDown = false;
let replyStatus = 200;
let windowOpen = false;
const self = {
  location: { origin: 'https://squirl.example.invalid' },
  addEventListener: (event, fn) => { handlers[event] = fn; },
  registration: { showNotification: async (title, options) => { notices.push({ title, ...options }); } },
  clients: { claim: async () => {}, matchAll: async () => windowOpen ? [{ url: 'https://squirl.example.invalid/app', postMessage: (m) => messages.push(m), navigate: async (url) => opened.push(url), focus: async () => {} }] : [], openWindow: async (url) => { opened.push(url); } },
};
const cache = {
  addAll: async (files) => { for (const f of files) cached.set(f, `cached:${f}`); },
  match: async (path) => cached.get(path),
};
const caches = {
  open: async () => cache, keys: async () => ['squirl-shell-old', 'other-app'],
  delete: async (key) => { assert.notEqual(key, 'other-app'); }, match: cache.match,
};
const source = await readFile(new URL('dist/sw.js', root), 'utf8');
vm.runInNewContext(source, { self, caches, URL, fetch: async (path, options) => {
  if (networkDown) throw new Error('offline');
  if (String(path).startsWith('/api/notifications/payments/')) {
    replies.push({ path, options });
    return { ok: replyStatus === 200, json: async () => ({ success: replyStatus === 200 }) };
  }
  return 'network';
} });
async function event(type, fields = {}) {
  let work;
  handlers[type]({ ...fields, waitUntil: (p) => { work = p; }, respondWith: (p) => { work = p; } });
  return work;
}
await event('install'); await event('activate');
assert(cached.has('/offline.html'));
assert(![...cached.keys()].some((p) => p.startsWith('/api') || p === '/app' || p === '/index.html'));
const request = (path, mode = 'cors', method = 'GET') => ({ url: `https://squirl.example.invalid${path}`, method, mode });
assert.equal(await event('fetch', { request: request('/api/transactions') }), undefined, 'financial data bypasses caches');
assert.equal(await event('fetch', { request: request('/api/users/me', 'cors', 'POST') }), undefined);
networkDown = true;
assert.equal(await event('fetch', { request: request('/app/tasks/today', 'navigate') }), 'cached:/offline.html');
assert.equal(await event('fetch', { request: request('/icons/squirl-192.png') }), 'cached:/icons/squirl-192.png');
await event('push', { data: { json: () => ({ kind: 'bills', tag: 'bill-1', body: 'PRIVATE BANK DETAILS', url: 'https://evil.invalid' }) } });
assert.equal(notices[0].title, 'Squirl'); assert(!notices[0].body.includes('PRIVATE'));
assert.equal(notices[0].data.url, '/app/finance/payments');
await event('push', { data: { json: () => { throw new Error('malformed'); } } });
assert.equal(notices.length, 2, 'malformed push still displays a generic notification');
await event('notificationclick', { notification: { close() {}, data: { url: 'https://evil.invalid' } } });
assert.deepEqual(opened, ['https://squirl.example.invalid/app']);
await event('notificationclick', { notification: { close() {}, data: { url: '/app/tasks/habits' } } });
assert.equal(opened[1], 'https://squirl.example.invalid/app/tasks/habits');
const id = 'a'.repeat(24);
windowOpen = true; networkDown = false;
await event('push', { data: { json: () => ({ kind: 'sms_payment', promptId: id, body: 'PRIVATE AMOUNT', url: 'https://evil.invalid' }) } });
const payment = notices.at(-1);
assert.equal(payment.actions[0].type, 'text');
assert.equal(payment.actions[0].action, 'add-note');
assert.equal(payment.data.url, `/app/finance/ledger?payment=${id}`);
assert(!payment.body.includes('PRIVATE'));
assert.equal(messages.at(-1).type, 'squirl:payment-recorded');
await event('notificationclick', { action: 'add-note', reply: '  Lunch  ', notification: { close() {}, data: payment.data } });
assert.equal(replies.length, 1);
assert.equal(replies[0].path, `/api/notifications/payments/${id}/reply`);
assert.equal(JSON.parse(replies[0].options.body).note, 'Lunch');
assert.equal(replies[0].options.credentials, 'same-origin');
assert.equal(replies[0].options.headers['X-Requested-With'], 'squirl');
assert.equal(replies[0].options.redirect, 'error');
assert.equal(messages.at(-1).type, 'squirl:payment-note-saved');
await event('notificationclick', { action: '', notification: { close() {}, data: payment.data } });
assert.equal(opened.at(-1), `https://squirl.example.invalid/app/finance/ledger?payment=${id}`);
const beforeFailure = messages.length;
networkDown = true;
await event('notificationclick', { action: 'add-note', reply: 'Groceries', notification: { close() {}, data: payment.data } });
assert.equal(notices.at(-1).data.failedNote, 'Groceries', 'a failed save retains the typed reply for explicit retry');
assert(!notices.at(-1).body.includes('Groceries'), 'draft text is not displayed on the lock screen');
assert.equal(messages.length, beforeFailure, 'failed save never announces success');
const failed = notices.at(-1);
networkDown = false;
await event('notificationclick', { action: 'retry-note', notification: { close() {}, data: failed.data } });
assert.equal(JSON.parse(replies.at(-1).options.body).note, 'Groceries');
replyStatus = 401;
await event('notificationclick', { action: 'add-note', reply: 'Still here', notification: { close() {}, data: payment.data } });
assert.equal(notices.at(-1).data.failedNote, 'Still here');
await event('notificationclick', { action: 'add-note', reply: '', notification: { close() {}, data: payment.data } });
assert.equal(opened.at(-1), `https://squirl.example.invalid/app/finance/ledger?payment=${id}`, 'missing inline-reply support falls back to the form');
await event('notificationclick', { action: 'add-note', reply: 'Attack', notification: { close() {}, data: { kind: 'sms_payment', promptId: '../../evil', url: 'https://evil.invalid' } } });
assert.equal(opened.at(-1), 'https://squirl.example.invalid/app');
console.log('Passed: shell-only cache, private notifications, safe links, inline payment replies, session/CSRF headers, retry drafts, auth/offline failures, client refresh, and form fallback.');
