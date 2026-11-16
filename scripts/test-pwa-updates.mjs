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

// ── Update detection and the automatic ("when I'm away") install, in a fresh sandbox with a manual clock ──
async function scenario({ waiting = true, controller = true, mode, build = { id: 'abc1234', at: '2026-11-16T13:27:15+05:30', v: '1.0.0' } } = {}) {
  let reloadCount = 0; let activationCount = 0; const timers = []; const store = new Map(); let reg;
  if (mode) store.set('squirl.updateMode', mode);
  class W extends EventTarget {
    constructor(state, info) { super(); this.state = state; this.info = info; }
    postMessage(data, ports) {
      if (data.type === 'PWA_STATUS') ports[0].postMessage({ paymentNotes: true, version: 'squirl-shell-x', build: this.info });
      if (data.type === 'ACTIVATE_UPDATE') { activationCount++; this.state = 'activated'; reg.active = this; reg.waiting = null; this.dispatchEvent(new Event('statechange')); }
    }
  }
  const doc = Object.assign(new EventTarget(), { hidden: false, dialogOpen: false, querySelector: () => (doc.dialogOpen ? {} : null) });
  reg = Object.assign(new EventTarget(), { active: new W('activated', { id: 'old0000', at: null, v: '1.0.0' }), waiting: waiting ? new W('installed', build) : null, installing: null, update: async () => {} });
  const box = {
    window: { isSecureContext: true, location: { reload: () => { reloadCount++; } } },
    navigator: { serviceWorker: { controller: controller ? {} : null, register: async () => reg, getRegistration: async () => reg } },
    document: doc, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    MessageChannel, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; }, setInterval: () => 0,
  };
  vm.runInNewContext(source.replace('globalThis.subject', 'globalThis.subject2').replace('{ registerPwa,', '{ getUpdateState, getUpdateMode, setUpdateMode, checkForUpdates, registerPwa,'), box);
  box.subject2.registerPwa();
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  const run = async () => { for (const t of timers.splice(0)) await t.fn?.(); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r)); };
  return { api: box.subject2, doc, reg, W, timers, run, counts: () => ({ reloads: reloadCount, activations: activationCount }), store };
}

{ // a waiting build is noticed and described; the running build is read too
  const s = await scenario({ mode: 'ask' });
  const st = s.api.getUpdateState();
  assert.equal(st.ready, true); assert.equal(st.next.id, 'abc1234'); assert.equal(st.current.id, 'old0000');
  await s.run(); assert.deepEqual(s.counts(), { reloads: 0, activations: 0 }, '"ask me first" never installs by itself');
}
{ // first install: nothing to update
  const s = await scenario({ controller: false });
  assert.equal(s.api.getUpdateState().ready, false);
}
{ // nothing waiting: no banner, and a check that finds nothing says so
  const s = await scenario({ waiting: false });
  assert.equal(s.api.getUpdateState().ready, false);
  assert.equal(await s.api.checkForUpdates(), false);
  assert.ok(s.api.getUpdateState().checkedAt);
}
{ // default mode installs on opening the app, once
  const s = await scenario({});
  assert.equal(s.api.getUpdateMode(), 'idle');
  await s.run(); assert.deepEqual(s.counts(), { reloads: 1, activations: 1 });
}
{ // unsaved typing or an open dialog blocks it; the banner state stays
  const typing = await scenario({ waiting: false });
  const typed = new Event('input');
  Object.defineProperty(typed, 'target', { value: { tagName: 'TEXTAREA', type: 'textarea' } });
  typing.doc.dispatchEvent(typed);
  typing.reg.waiting = new typing.W('installed', { id: 'new1111' });
  typing.reg.dispatchEvent(new Event('updatefound')); // not installing: ignored
  typing.reg.installing = typing.reg.waiting; typing.reg.dispatchEvent(new Event('updatefound'));
  await typing.run();
  assert.equal(typing.api.getUpdateState().ready, true);
  assert.deepEqual(typing.counts(), { reloads: 0, activations: 0 }, 'a build found while typing waits');
  typing.doc.hidden = true; typing.doc.dispatchEvent(new Event('visibilitychange'));
  assert.ok(typing.timers.some((t) => t.fn && t.ms === 30000), 'going away starts the 30 s idle timer');
  await typing.run(); assert.deepEqual(typing.counts(), { reloads: 0, activations: 0 }, 'still blocked: text was typed');

  const dialog = await scenario({ waiting: false });
  dialog.doc.dialogOpen = true;
  dialog.reg.installing = dialog.reg.waiting = new dialog.W('installed', { id: 'new2222' });
  dialog.reg.dispatchEvent(new Event('updatefound'));
  await dialog.run(); dialog.doc.hidden = true; dialog.doc.dispatchEvent(new Event('visibilitychange')); await dialog.run();
  assert.deepEqual(dialog.counts(), { reloads: 0, activations: 0 }, 'an open dialog blocks it');
}
{ // found while the app is in use: installs after 30 s away, not before
  const s = await scenario({ waiting: false });
  s.reg.installing = s.reg.waiting = new s.W('installed', { id: 'new3333' });
  s.reg.dispatchEvent(new Event('updatefound'));
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  assert.equal(s.api.getUpdateState().ready, true);
  assert.deepEqual(s.counts(), { reloads: 0, activations: 0 }, 'visible and in use: nothing happens');
  s.doc.hidden = true; s.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(s.timers.filter((t) => t.fn && t.ms === 30000).length, 1);
  s.doc.hidden = false; s.doc.dispatchEvent(new Event('visibilitychange'));
  await s.run(); assert.deepEqual(s.counts(), { reloads: 0, activations: 0 }, 'coming back cancels the install');
  s.doc.hidden = true; s.doc.dispatchEvent(new Event('visibilitychange')); await s.run();
  assert.deepEqual(s.counts(), { reloads: 1, activations: 1 }, 'away for 30 s: installed');
  s.api.setUpdateMode('ask'); assert.equal(s.api.getUpdateMode(), 'ask'); assert.equal(s.store.get('squirl.updateMode'), 'ask');
}

console.log('Passed: old-worker detection, explicit activation/reload, in-progress installation, failed installation, outdated-server reporting, update detection, no banner on first install, ask-first mode, auto-install on opening or after 30 s away, and blocking on unsaved typing or an open dialog.');
