import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

let reloads = 0, updates = 0, activations = 0;
let registration;
class Worker extends EventTarget {
  constructor(state, supportsReplies = true) { super(); this.state = state; this.supportsReplies = supportsReplies; }
  postMessage(data, ports) {
    if (data.type === 'PWA_STATUS' && this.supportsReplies) ports[0].postMessage({ paymentNotes: true });
    if (data.type === 'ACTIVATE_UPDATE') {
      activations++; this.state = 'activated'; registration.active = this; registration.waiting = null;
      this.dispatchEvent(new Event('statechange'));
    }
  }
}
const original = await readFile(new URL('../src/pwa/client.js', import.meta.url), 'utf8');
const source = original.replace('import.meta.env.PROD', 'true').replaceAll('export ', '')
  + '\nglobalThis.subject = { registerPwa, paymentRepliesReady, updatePwa };';
const sandbox = {
  window: { isSecureContext: true, PushManager: {}, Notification: {}, location: { reload: () => { reloads++; } } },
  navigator: { serviceWorker: { getRegistration: async () => registration, register: async () => registration } },
  MessageChannel, setTimeout, clearTimeout,
};
vm.runInNewContext(source, sandbox);
const { subject } = sandbox;
registration = { active: new Worker('activated', false), waiting: null, installing: null, update: async () => { updates++; } };
subject.registerPwa();
assert.equal(await subject.paymentRepliesReady(), false, 'an old active worker cannot claim payment-reply support');
registration.waiting = new Worker('installed');
await subject.updatePwa();
assert.equal(updates, 1); assert.equal(activations, 1); assert.equal(reloads, 1);
assert.equal(await subject.paymentRepliesReady(), true);
await subject.updatePwa(); assert.equal(reloads, 2, 'a current worker can reload the app without replacing the push subscription');

registration.active = new Worker('activated', false);
await assert.rejects(subject.updatePwa(), /older app build/);
assert.equal(reloads, 2, 'an outdated server build never claims the update succeeded');
registration.active = new Worker('activated', false);
registration.update = async () => {
  const worker = new Worker('installing'); registration.installing = worker;
  setTimeout(() => { worker.state = 'installed'; registration.installing = null; registration.waiting = worker; worker.dispatchEvent(new Event('statechange')); }, 10);
};
await subject.updatePwa(); assert.equal(reloads, 3); assert.equal(activations, 2);
registration.update = async () => {
  const worker = new Worker('installing'); registration.installing = worker;
  setTimeout(() => { worker.state = 'redundant'; registration.installing = null; worker.dispatchEvent(new Event('statechange')); }, 10);
};
await assert.rejects(subject.updatePwa(), /could not install/);
assert.equal(reloads, 3);
console.log('Passed: old-worker detection, explicit activation/reload, in-progress installation, failed installation, and outdated-server reporting.');
