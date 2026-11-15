// Pure logic behind "is there anything to save?" on the settings pages. No React, no network.
import assert from 'node:assert/strict';
import { sameSettings, hasChanges, normalisePreferences, saveState, SAVE_TEXT } from '../src/lib/settingsDraft.js';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import { accountDraft } from '../src/features/profile/smsSetup.js';

// Key order never counts as a change.
assert.equal(sameSettings({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 }), true);
assert.equal(sameSettings({ a: 1 }, { a: 2 }), false);
assert.equal(sameSettings([1, 2], [2, 1]), false, 'array order does matter');

// Nothing to save until both sides are loaded and they differ.
assert.equal(hasChanges(null, { a: 1 }), false);
assert.equal(hasChanges({ a: 1 }, null), false);
assert.equal(hasChanges({ a: 1 }, { a: 1 }), false);
assert.equal(hasChanges({ a: 1 }, { a: 2 }), true);

// Notifications: options an older device never stored count as on, so an untouched form is clean...
const server = { tasks: true, habits: false, bills: true, dailyTime: '08:00', habitTime: '20:00' };
const shown = normalisePreferences(server);
assert.deepEqual([shown.smsPayments, shown.captures, shown.details], [true, true, true]);
assert.equal(hasChanges(shown, normalisePreferences(server)), false);
// ...and turning one off, or moving a time, is a change that Save should pick up.
assert.equal(hasChanges({ ...shown, captures: false }, normalisePreferences(server)), true);
assert.equal(hasChanges({ ...shown, dailyTime: '09:30' }, normalisePreferences(server)), true);
assert.equal(hasChanges({ ...shown, captures: false }, { ...shown, captures: false }), false, 'once saved, it is clean again');
assert.equal(normalisePreferences(null), null);
assert.equal(normalisePreferences({ ...server, details: false }).details, false, 'a saved "off" is kept');

// Bank SMS: the form starts clean, typing makes it dirty, and the server's answer makes it clean again.
const none = accountDraft([]);
assert.equal(hasChanges(none, accountDraft([])), false);
assert.equal(hasChanges({ ...none, sbi: { ...none.sbi, last4: '1234' } }, none), true);
const stored = [{ bank: 'sbi', last4: '1234', senders: ['SBIUPI'] }];
assert.equal(hasChanges({ ...none, sbi: { ...none.sbi, last4: '1234' } }, accountDraft(stored)), true, 'saved flag differs until the server confirms');
assert.equal(hasChanges(accountDraft(stored), accountDraft(stored)), false);
const edited = accountDraft(stored);
edited.sbi.senders = 'SBIUPI\nSBIINB';
assert.equal(hasChanges(edited, accountDraft(stored)), true);

// The status line.
assert.equal(saveState({ dirty: false }), 'saved');
assert.equal(saveState({ dirty: true }), 'dirty');
assert.equal(saveState({ dirty: true, pending: true }), 'saving');
assert.equal(saveState({ dirty: true, error: true }), 'error', 'a failed save says so and keeps the edits');
assert.equal(saveState({ dirty: false, error: true }), 'error');
assert.equal(saveState({ dirty: false, pending: true, error: true }), 'saving');
assert.deepEqual(Object.keys(SAVE_TEXT).sort(), ['dirty', 'error', 'saved', 'saving']);
assert.equal(SAVE_TEXT.saved, 'All changes saved');

// The SaveBar itself: Save is disabled when clean, enabled with edits, and the status says which.
const server2 = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { SaveBar } = await server2.ssrLoadModule('/src/components/ui/SaveBar.jsx');
  const html = (props) => renderToString(React.createElement(SaveBar, { onSave() {}, onDiscard() {}, ...props }));
  const saveDisabled = (h) => /<button[^>]*disabled=""[^>]*>Save<\/button>/.test(h) || /<button[^>]*disabled=""[^>]*>Saving…<\/button>/.test(h);
  let h = html({ dirty: false });
  assert.match(h, /All changes saved/);
  assert.equal(saveDisabled(h), true, 'nothing to save: the button is disabled');
  assert.doesNotMatch(h, /Discard/);
  h = html({ dirty: true });
  assert.match(h, /Unsaved changes/);
  assert.equal(saveDisabled(h), false);
  assert.match(h, /Discard/);
  h = html({ dirty: true, pending: true });
  assert.match(h, /Saving…/);
  assert.equal(saveDisabled(h), true, 'cannot be pressed twice while saving');
  assert.doesNotMatch(h, /Discard/);
  h = html({ dirty: true, invalid: true });
  assert.equal(saveDisabled(h), true, 'invalid input blocks Save');
  h = html({ dirty: true, error: true });
  assert.match(h, /Not saved/);
  assert.match(html({ dirty: false, idleText: 'No bank set up yet' }), /No bank set up yet/);
  assert.doesNotMatch(html({ dirty: false, idleText: 'No bank set up yet' }), /All changes saved/);
  assert.match(html({ dirty: false, children: React.createElement('button', null, 'Send test') }), /Send test/);
} finally {
  await server2.close();
}

console.log('settings draft tests passed');
