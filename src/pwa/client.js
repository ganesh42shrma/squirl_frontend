let registration;

export function registerPwa() {
  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  registration = navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => null);
}

export const supportsPush = () => window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export async function getRegistration() {
  if (!supportsPush()) return null;
  if (registration) await registration;
  return navigator.serviceWorker.getRegistration('/');
}

export async function paymentRepliesReady() {
  const worker = (await getRegistration())?.active;
  if (!worker) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (value) => {
      clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(value);
    };
    const timer = setTimeout(() => finish(false), 1500);
    channel.port1.onmessage = (event) => finish(event.data?.paymentNotes === true);
    try { worker.postMessage({ type: 'PWA_STATUS' }, [channel.port2]); }
    catch { finish(false); }
  });
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
  const worker = await getRegistration();
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
