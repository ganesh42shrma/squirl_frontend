// The build script inserts only public interface files. API responses and records are never cached.
const CACHE = __CACHE_NAME__;
const FILES = __PRECACHE_FILES__;
const paths = new Set(FILES);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  // Let existing windows finish before replacing their worker and cached assets.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('squirl-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  } else if (paths.has(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(request)));
  }
});

const NOTICES = {
  tasks: { body: 'You have tasks to review. Open Squirl for details.', url: '/app/tasks/today' },
  habits: { body: 'A habit check-in is waiting. Open Squirl for details.', url: '/app/tasks/habits' },
  bills: { body: 'You have a payment reminder. Open Squirl for details.', url: '/app/finance/payments' },
  test: { body: 'Notifications are working on this device.', url: '/app/profile' },
};
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* An empty push still displays a generic notice. */ }
  const notice = NOTICES[data.kind] || { body: 'You have a Squirl reminder. Open the app for details.', url: '/app' };
  event.waitUntil(self.registration.showNotification('Squirl', {
    body: notice.body,
    icon: '/icons/squirl-192.png',
    tag: /^[a-z0-9-]{1,64}$/.test(data.tag || '') ? data.tag : 'squirl-reminder',
    data: { url: notice.url },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.url;
  const allowed = new Set(['/app', ...Object.values(NOTICES).map((n) => n.url)]);
  const target = new URL(allowed.has(path) ? path : '/app', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target); await existing.focus(); }
    else await self.clients.openWindow(target);
  })());
});
