let registration;

export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  registration = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then((reg) => { watchForUpdates(reg); return reg; })
    .catch(() => null);
}

/* ── Updates ───────────────────────────────────────────────────────────────────────────────────────────────────
 * A new build installs in the background and waits. We notice it (banner + Settings), and, if the person chose
 * "when I'm away" (the default), apply it for them when the app has been out of sight for a while or is just being
 * opened, but never while they have typed something unsaved or a dialog is open. */
const MODE_KEY = 'squirl.updateMode'; // 'idle' | 'ask'
const IDLE_MS = 30_000; // hidden this long counts as "away"
const CHECK_EVERY_MS = 60 * 60 * 1000;

let updateState = { supported: false, ready: false, checking: false, current: null, next: null, checkedAt: null, error: '' };
const updateListeners = new Set();
let typedUnsaved = false; // text typed in a field and not submitted since: a reload now could lose it
let idleTimer;
let autoTried = false; // one automatic attempt per page load, so a failing update can never loop

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  updateListeners.forEach((fn) => fn(updateState));
}
export const getUpdateState = () => updateState;
export function subscribeUpdates(fn) { updateListeners.add(fn); return () => updateListeners.delete(fn); }

export function getUpdateMode() {
  try { return localStorage.getItem(MODE_KEY) === 'ask' ? 'ask' : 'idle'; } catch { return 'idle'; }
}
export function setUpdateMode(mode) {
  try { localStorage.setItem(MODE_KEY, mode === 'ask' ? 'ask' : 'idle'); } catch { /* storage blocked: the default applies */ }
  setUpdateState({});
  scheduleAutoApply();
}

/** What a worker says about its own build: { id, at, v } (older builds only know their cache name). */
async function buildOf(worker) {
  const info = await askWorker(worker);
  if (!info) return null;
  return info.build || { id: String(info.version || '').slice(-7) || null, at: null, v: null };
}

function readyWith(worker, { opening = false } = {}) {
  buildOf(worker).then((next) => { setUpdateState({ ready: true, next, error: '' }); scheduleAutoApply({ opening }); });
}

function watchForUpdates(reg) {
  setUpdateState({ supported: true });
  // The running build. On a first visit the worker is not active yet, so wait for it.
  const readCurrent = (worker) => buildOf(worker).then((current) => current && setUpdateState({ current }));
  if (reg.active) readCurrent(reg.active);
  else navigator.serviceWorker.ready?.then((r) => readCurrent(r.active));
  const track = (worker) => {
    const done = () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) readyWith(worker); };
    worker.addEventListener('statechange', done); done();
  };
  // A first-ever install has no controller yet: nothing to update, so no banner.
  // Already waiting as the app opens (downloaded last time): the safest moment to install it.
  if (reg.waiting && navigator.serviceWorker.controller) readyWith(reg.waiting, { opening: true });
  reg.addEventListener('updatefound', () => { if (reg.installing) track(reg.installing); });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el?.tagName === 'TEXTAREA' || (el?.tagName === 'INPUT' && /^(text|email|tel|number|url|password|date|time)?$/.test(el.type || ''))) typedUnsaved = true;
  }, true);
  document.addEventListener('submit', () => { typedUnsaved = false; }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scheduleAutoApply();
    else { clearTimeout(idleTimer); reg.update().catch(() => {}); }
  });
  setInterval(() => reg.update().catch(() => {}), CHECK_EVERY_MS);
}

const safeToReload = () => !typedUnsaved && !document.querySelector('dialog[open]');

function scheduleAutoApply({ opening = false } = {}) {
  clearTimeout(idleTimer);
  if (!updateState.ready || getUpdateMode() !== 'idle' || autoTried) return;
  const apply = () => {
    if (!updateState.ready || getUpdateMode() !== 'idle' || autoTried || !safeToReload()) return;
    autoTried = true;
    updatePwa().catch((e) => setUpdateState({ error: e.message }));
  };
  if (opening) idleTimer = setTimeout(apply, 0);
  else if (document.hidden) idleTimer = setTimeout(apply, IDLE_MS);
}

/** "Check for updates": looks now and resolves true when a new version is waiting. */
export async function checkForUpdates() {
  const reg = await getWorkerRegistration();
  if (!reg) throw new Error('Open Squirl from your private HTTPS address first.');
  setUpdateState({ checking: true, error: '' });
  try {
    await reg.update();
    if (reg.installing) await waitForState(reg.installing, 'installed');
    if (reg.waiting && navigator.serviceWorker.controller) readyWith(reg.waiting);
    setUpdateState({ checkedAt: Date.now() });
    return Boolean(reg.waiting);
  } catch (e) {
    setUpdateState({ error: e.message });
    throw e;
  } finally { setUpdateState({ checking: false }); }
}

export const supportsPush = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function getRegistration() {
  if (!supportsPush()) return null;
  if (registration) await registration;
  return navigator.serviceWorker.getRegistration('/');
}

function askWorker(worker) {
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (value) => {
      clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value);
    };
    const timer = setTimeout(() => finish(null), 1500);
    channel.port1.onmessage = (event) => finish(event.data || null);
    try { worker.postMessage({ type: 'PWA_STATUS' }, [channel.port2]); }
    catch { finish(null); }
  });
}

// Updates need a service worker and a secure page, but not push (some browsers have the first and not the second).
async function getWorkerRegistration() {
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return null;
  if (registration) await registration;
  return navigator.serviceWorker.getRegistration('/');
}

export async function paymentRepliesReady() {
  const info = await askWorker((await getWorkerRegistration())?.active);
  return info?.paymentNotes === true;
}

function waitForState(worker, state) {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (worker.state === state) finish();
      else if (worker.state === 'redundant') finish(new Error('The app update could not install. Check Tailscale and try again.'));
    };
    const finish = (error) => {
      clearTimeout(timer); worker.removeEventListener('statechange', check);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('The app update is still downloading. Try Update app again shortly.')), 30_000);
    worker.addEventListener('statechange', check); check();
  });
}

export async function updatePwa() {
  const worker = await getWorkerRegistration();
  if (!worker) throw new Error('Open Squirl from your private HTTPS address first.');
  await worker.update();
  if (worker.installing) await waitForState(worker.installing, 'installed');
  const waiting = worker.waiting;
  if (waiting) {
    const activated = waitForState(waiting, 'activated');
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    await activated;
  }
  if (!await paymentRepliesReady()) throw new Error('The server is still serving an older app build. Rebuild the frontend on Linux, then try Update app again.');
  window.location.reload();
}

export async function getSubscription() {
  const worker = await getRegistration();
  return worker ? worker.pushManager.getSubscription() : null;
}

export async function enablePush(publicKey) {
  // Request permission directly from a click, before awaiting network requests.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in this site’s browser settings to continue.');
  const worker = await getRegistration();
  if (!worker?.active) throw new Error('Squirl is preparing this device. Reload the app and try again.');
  const padded = publicKey.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(padded + '='.repeat((4 - padded.length % 4) % 4)), (c) => c.charCodeAt(0));
  return worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
}

export async function clearBrowserPush() {
  const worker = await getRegistration();
  if (!worker) return;
  const subscription = await worker.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
  const notices = await worker.getNotifications();
  for (const notice of notices) notice.close();
}
