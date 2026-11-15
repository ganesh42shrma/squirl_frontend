// The build script inserts only public interface files. API responses and records are never cached.
const CACHE = __CACHE_NAME__;
const FILES = __PRECACHE_FILES__;
const paths = new Set(FILES);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  // Let existing windows finish before replacing their worker and cached assets.
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Keep previous hashed assets for other open windows until a later single-window update.
    if (windows.length <= 1) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('squirl-shell-') && k !== CACHE).map((k) => caches.delete(k)));
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PWA_STATUS') event.ports?.[0]?.postMessage({ paymentNotes: true, version: CACHE });
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
  } else if (paths.has(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(request)));
  } else if (/^\/assets\/[^/]+\.(?:js|css|woff2?|svg|png)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

// The large icon is the app icon; the badge is a white acorn silhouette for the status bar.
const LOOK = { icon: '/icons/squirl-192.png', badge: '/icons/squirl-badge.png', lang: 'en-IN', vibrate: [60, 40, 60] };

// Push data is only ever read through these: text is flattened and capped, numbers range-checked,
// and nothing (no body, title or URL) is shown just because the payload contains it.
const text = (value, max = 60) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const count = (value) => (Number.isInteger(value) && value > 0 && value < 10000 ? value : 0);
const money = (value) => (Number.isFinite(value) && value > 0 && value < 1e12
  ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value) : '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const dueIn = (days) => (days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);
const moment = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) && t <= Date.now() + 300_000 ? t : Date.now(); };

/*
 * Each kind: where a tap goes, the plain line (used when this device keeps details off, so the
 * server sends no `detail`), and the personal line built from the detail. Returns [title, body].
 */
const NOTICES = {
  tasks: {
    url: '/app/tasks/today',
    plain: ['Today’s quests', 'You have tasks waiting.'],
    detail: (d) => {
      const title = text(d.title), first = text(d.first), n = count(d.count), overdue = count(d.overdue);
      if (title) return [`Due now${/^\d\d:\d\d$/.test(d.time || '') ? ` · ${d.time}` : ''}`, title];
      if (!n || !first) return null;
      return [overdue ? `${plural(n, 'quest')} waiting · ${overdue} overdue` : `${plural(n, 'quest')} for today`, n > 1 ? `${first} and ${n - 1} more` : first];
    },
  },
  habits: {
    url: '/app/tasks/habits',
    plain: ['Keep your streak alive', 'A habit is still waiting today.'],
    detail: (d) => {
      const names = (Array.isArray(d.names) ? d.names : []).map((n) => text(n, 30)).filter(Boolean).slice(0, 3), n = count(d.count);
      return n && names.length ? [`Keep your streak alive · ${plural(n, 'habit')} left`, names.join(' · ') + (n > names.length ? ` +${n - names.length}` : '')] : null;
    },
  },
  bills: {
    url: '/app/finance/payments',
    plain: ['Payment reminder', 'A bill or EMI needs a look.'],
    detail: (d) => {
      const name = text(d.name, 40), amount = money(d.amount), more = count(d.count) > 1 ? ` · ${plural(count(d.count) - 1, 'more due', 'more due')}` : '';
      if (!name) return null;
      if (d.missed === true) return [`Missed: ${name}`, `${amount ? `${amount} · ` : ''}Tap to record it${more}`];
      const days = Number.isInteger(d.daysUntil) && d.daysUntil >= 0 && d.daysUntil < 100 ? d.daysUntil : 0;
      return [`${name} due ${dueIn(days)}`, `${amount || 'Tap to see it'}${more}`];
    },
  },
  captures: {
    url: '/app?capture=inbox',
    plain: ['Your capture inbox', 'Some quick notes are waiting to be sorted.'],
    detail: (d) => {
      const n = count(d.count), first = text(d.first, 50);
      return n && first ? [`${plural(n, 'note')} to sort`, n > 1 ? `${first} and ${n - 1} more` : first] : null;
    },
  },
  test: {
    url: '/app/settings/notifications',
    plain: ['Squirl is set up', 'Reminders will look like this.'],
    detail: () => ['You’re all set', 'This is how Squirl will reach you.'],
  },
};
const lines = (kind, detail) => {
  const notice = NOTICES[kind];
  if (!notice) return ['Squirl', 'Something needs a look.'];
  return (detail && typeof detail === 'object' && notice.detail(detail)) || notice.plain;
};

const paymentId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const paymentPath = (id) => `/app/finance/ledger?payment=${id}`;
// "₹450 spent" / "Swiggy · What was it for?" with details on; a plain prompt without.
function paymentLines(detail) {
  const amount = detail && money(detail.amount), party = detail && text(detail.party, 50);
  if (!amount) return ['New payment', 'What was this for?'];
  return [`${amount} ${detail.type === 'credit' ? 'received' : 'spent'}`, party ? `${party} · What was it for?` : 'What was it for?'];
}
function paymentNotice(id, { detail, failedNote, error } = {}) {
  const [title, body] = paymentLines(detail);
  const options = {
    ...LOOK, body: error || body, tag: `sms-payment-${id}`,
    // A new payment buzzes again even if an older one is still showing; a failed retry stays quiet.
    renotify: !failedNote, silent: Boolean(failedNote), timestamp: moment(detail?.at),
    actions: [
      ...(failedNote ? [{ action: 'retry-note', title: 'Try again' }] : []),
      { action: 'add-note', type: 'text', title: 'Add note', placeholder: 'What was it for?' },
    ],
    data: { kind: 'sms_payment', promptId: id, url: paymentPath(id), ...(detail && { detail }), ...(failedNote && { failedNote }) },
  };
  return self.registration.showNotification(title, options).catch(() => {
    // Browsers without reply-action support can still open the note form.
    const { actions, ...fallback } = options;
    return self.registration.showNotification(title, fallback);
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
    const detail = data.detail && typeof data.detail === 'object' ? { amount: data.detail.amount, type: data.detail.type, party: data.detail.party, at: data.detail.at } : undefined;
    event.waitUntil(Promise.all([paymentNotice(data.promptId, { detail }), tellWindows('squirl:payment-recorded', data.promptId)]));
    return;
  }
  const [title, body] = lines(data.kind, data.detail);
  event.waitUntil(self.registration.showNotification(title, {
    ...LOOK, body, timestamp: Date.now(),
    tag: /^[a-z0-9-]{1,64}$/.test(data.tag || '') ? data.tag : 'squirl-reminder',
    data: { url: NOTICES[data.kind]?.url || '/app' },
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
        await paymentNotice(id, { detail: data.detail, failedNote: note,
          error: note.trim().length > 500 ? 'Too long. Keep it under 500 characters.' : 'Couldn’t save your note. Try again, or tap to open Squirl.' });
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
