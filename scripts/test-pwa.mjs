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
let networkDown = false;
const self = {
  location: { origin: 'https://squirl.example.invalid' },
  addEventListener: (event, fn) => { handlers[event] = fn; },
  registration: { showNotification: async (title, options) => { notices.push({ title, ...options }); } },
  clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url) => { opened.push(url); } },
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
vm.runInNewContext(source, { self, caches, URL, fetch: async () => { if (networkDown) throw new Error('offline'); return 'network'; } });
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
console.log('Passed: manifest and icon dimensions, shell-only cache, API bypass, offline fallback, private notification text, malformed push, and safe notification links.');
