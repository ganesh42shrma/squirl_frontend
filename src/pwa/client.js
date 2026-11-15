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
