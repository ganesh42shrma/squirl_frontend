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
const paymentId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const paymentPath = (id) => `/app/finance/ledger?payment=${id}`;
function paymentNotice(id, failedNote, body = 'A new payment was recorded. What was this for?') {
  const options = {
    body, icon: '/icons/squirl-192.png', tag: `sms-payment-${id}`,
    actions: [
      ...(failedNote ? [{ action: 'retry-note', title: 'Retry saving' }] : []),
      { action: 'add-note', type: 'text', title: 'Add note', placeholder: 'What was this for? (500 characters)' },
    ],
    data: { kind: 'sms_payment', promptId: id, url: paymentPath(id), ...(failedNote && { failedNote }) },
  };
  return self.registration.showNotification('Squirl', options).catch(() => {
    // Browsers without reply-action support can still open the note form.
    const { actions, ...fallback } = options;
    return self.registration.showNotification('Squirl', fallback);
  });
}
async function tellWindows(type, promptId) {
  try {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) client.postMessage({ type, promptId });
  } catch { /* A closing window can refresh its ledger when reopened. */ }
}
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* An empty push still displays a generic notice. */ }
  if (data.kind === 'sms_payment' && paymentId(data.promptId)) {
    event.waitUntil(Promise.all([paymentNotice(data.promptId), tellWindows('squirl:payment-recorded', data.promptId)]));
    return;
  }
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
  const data = event.notification.data || {};
  const id = data.kind === 'sms_payment' && paymentId(data.promptId) ? data.promptId : null;
  const note = id && (event.action === 'retry-note' ? data.failedNote : event.action === 'add-note' ? event.reply : null);
  if (typeof note === 'string' && note.trim()) {
    event.waitUntil((async () => {
      try {
        if (note.trim().length > 500) throw new Error('NOTE_TOO_LONG');
        const response = await fetch(`/api/notifications/payments/${id}/reply`, {
          method: 'POST', credentials: 'same-origin', redirect: 'error',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'squirl' },
          body: JSON.stringify({ note: note.trim() }),
        });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error('NOT_SAVED');
        await tellWindows('squirl:payment-note-saved', id);
      } catch {
        // Keep the unsent reply in the device's notification, never in a URL or shell cache.
        await paymentNotice(id, note, 'Note not saved. Connect Tailscale and retry, or tap to open Squirl. Notes can be up to 500 characters.');
      }
    })());
    return;
  }
  const path = id ? paymentPath(id) : data.url;
  const allowed = new Set(['/app', ...Object.values(NOTICES).map((n) => n.url)]);
  const target = new URL(id || allowed.has(path) ? path : '/app', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(target); await existing.focus(); }
    else await self.clients.openWindow(target);
  })());
});
