// Command palette logic in plain Node: page commands, ranking, how proposed actions and search
// results read (with guest mode hiding amounts), and where results open.
import assert from 'node:assert/strict';
import { navCommands, rankCommands, scoreCommand, describeAction, describeResult, savedMessage, resultLink, relativeDay, undoMessage, newClientId, submissionFor, canUndo, needsCategory, engineFor } from '../src/features/capture/paletteModel.js';
import { photoTarget } from '../src/features/capture/paletteModel.js';
import { setGuestMode } from '../src/lib/guestMode.js';

// A tiny registry shaped like app/modules.js (the real one imports React pages).
const modules = [
  { id: 'finance', label: 'Finance', base: '/app/finance', blurb: 'Ledger and goals', quick: [{ label: 'Import a statement', to: '/app/finance/imports' }],
    tabs: [{ path: 'ledger', label: 'Ledger' }, { path: 'goals', label: 'Goals' }, { path: 'payments', label: 'EMIs & bills' }] },
  { id: 'tasks', label: 'Tasks', base: '/app/tasks', tabs: [{ path: 'today', label: 'Today' }, { path: 'habits', label: 'Streaks' }] },
];
const commands = navCommands(modules);
assert.ok(commands.some((c) => c.to === '/app/finance/ledger' && c.hint === 'Finance'), 'every tab is a command');
assert.ok(commands.some((c) => c.label === 'Import a statement'), 'quick actions are commands');
assert.ok(commands.some((c) => c.to === '/app/settings/notifications'));
assert.equal(new Set(commands.map((c) => c.id)).size, commands.length, 'ids are unique');

// Ranking: prefix beats word-prefix beats substring beats keyword beats in-order letters.
const labels = (q) => rankCommands(commands, q).map((c) => c.label);
assert.equal(labels('led')[0], 'Ledger');
assert.equal(labels('bills')[0], 'EMIs & bills');
assert.equal(labels('ldg')[0], 'Ledger', 'letters in order still match');
assert.ok(labels('finance').includes('Goals'), 'a module name finds its pages');
assert.deepEqual(labels('zzzz'), []);
assert.equal(scoreCommand({ label: 'Ledger' }, 'x'), 0);
assert.equal(scoreCommand({ label: 'Ledger' }, 'gd'), 0, 'letters out of order do not match');
assert.ok(scoreCommand({ label: 'Ledger' }, 'le') > scoreCommand({ label: 'Settle' }, 'le'));
assert.equal(rankCommands(commands, '', 3).length, 3, 'empty query lists the first few');

// Dates relative to the person's today.
const today = '2026-11-15'; // Sunday
assert.equal(relativeDay('2026-11-15', today), 'Today');
assert.equal(relativeDay('2026-11-16', today), 'Tomorrow');
assert.equal(relativeDay('2026-11-14', today), 'Yesterday');
assert.equal(relativeDay('2026-11-20', today), 'Fri');
assert.match(relativeDay('2026-12-25', today), /^Fri 25 Dec$/);

// Proposed actions.
const expense = { type: 'transaction', data: { date: today, description: 'Chai', amount: 40, direction: 'debit', categoryName: 'Cafes & Coffee', paymentMode: 'upi' } };
assert.deepEqual(describeAction(expense, today), { kind: 'expense', title: 'Expense ₹40 · Chai', detail: 'Cafes & Coffee · UPI' });
assert.equal(describeAction({ ...expense, data: { ...expense.data, date: '2026-11-14', categoryName: undefined } }, today).detail, 'Uncategorised · UPI · Yesterday');
assert.equal(describeAction({ type: 'transaction', data: { ...expense.data, direction: 'credit' } }, today).kind, 'income');
const task = describeAction({ type: 'task', data: { title: 'Call mom', dueDate: '2026-11-16', dueTime: '19:00' } }, today);
assert.deepEqual(task, { kind: 'task', title: 'Task · Call mom', detail: 'Due Tomorrow at 19:00 · you’ll get a reminder' });
assert.equal(describeAction({ type: 'task', data: { title: 'x', dueDate: null } }, today).detail, 'No due date');
assert.equal(describeAction({ type: 'habit', data: { name: 'Drink water', quantity: 6 } }, today).detail, '6 logged today');
assert.equal(describeAction({ type: 'note', data: { text: 'idea' } }, today).kind, 'note');

// A payment the bank already recorded is announced before saving; a habit shows the day it's for.
const matched = { ...expense, match: { description: 'UPI/DR/123456789012/RAMESH', date: today, account: 'sbi' } };
assert.equal(describeAction(matched, today).detail, 'Cafes & Coffee · UPI · Will be matched to your bank payment, not added twice');
assert.doesNotMatch(describeAction(expense, today).detail, /matched/);
assert.equal(describeAction({ type: 'habit', data: { name: 'Gym', date: '2026-11-14' } }, today).detail, 'Done for yesterday');
assert.equal(describeAction({ type: 'habit', data: { name: 'Gym', date: today } }, today).detail, 'Done for today');
assert.equal(describeAction({ type: 'habit', data: { name: 'Water', quantity: 6, date: '2026-11-14' } }, today).detail, '6 logged yesterday');

// Toasts: bank matches and undo.
assert.equal(savedMessage({ created: [{ type: 'transaction', direction: 'debit', amount: 40, label: 'Chai', matched: true }] }), 'Matched to your bank payment · ₹40 · Chai');
assert.equal(undoMessage([]), 'Undone');
assert.equal(undoMessage(undefined), 'Undone');
assert.equal(undoMessage([{ type: 'task' }]), 'Undone. Kept a completed task.');
assert.equal(undoMessage([{ type: 'transaction' }, { type: 'task' }]), 'Undone. Kept a completed task and a payment your bank has confirmed.');
assert.match(undoMessage([{ type: 'habit' }]), /too old/);

// One id per submission; a retry of the same body reuses it, an edited body gets a new one.
const id = newClientId();
assert.match(id, /^[A-Za-z0-9_-]{8,64}$/, 'ids pass the server check');
assert.notEqual(newClientId(), newClientId());
assert.match(newClientId({}), /^[0-9a-f]{32}$/, 'falls back without crypto.randomUUID');
assert.match(newClientId({ getRandomValues: (b) => b.fill(255) }), /^f{32}$/);
let made = 0;
const make = () => `id-${(made += 1)}`;
const body = { text: 'chai 40', engine: 'rules' };
const first = submissionFor(null, body, make);
assert.equal(submissionFor(first, { ...body }, make).clientId, first.clientId, 'same body: retry keeps the id');
assert.notEqual(submissionFor(first, { ...body, text: 'chai 45' }, make).clientId, first.clientId, 'edited text: a new submission');
assert.equal(made, 2);

// A retry the server recognised says so, and an undone save offers no Undo.
const replayedItem = { type: 'transaction', direction: 'debit', amount: 40, label: 'Chai' };
assert.equal(savedMessage({ replayed: true, created: [replayedItem], capture: { status: 'done' } }), 'Already saved');
assert.equal(savedMessage({ replayed: true, created: [replayedItem], capture: { status: 'undone' } }), 'That was already saved, then undone');
assert.equal(savedMessage({ replayed: true, created: [], capture: null, inbox: [{}] }), 'Already saved', 'notes-only saves replay too');
assert.equal(canUndo({ capture: { status: 'done' } }), true);
assert.equal(canUndo({ capture: { status: 'undone' } }), false);
assert.equal(canUndo({ capture: null, inbox: [{}] }), false);
assert.equal(canUndo(undefined), false);

// Toasts.
assert.equal(savedMessage({ created: [{ type: 'transaction', direction: 'debit', amount: 40, label: 'Chai' }] }), 'Saved expense ₹40 · Chai');
assert.equal(savedMessage({ created: [{ type: 'task', label: 'Call mom' }] }), 'Task added · Call mom');
assert.equal(savedMessage({ created: [{ type: 'habit', label: 'Gym' }, { type: 'task', label: 'x' }], inbox: [{}] }), 'Saved 3 items');
assert.equal(savedMessage({ created: [], inbox: [{}] }), 'Saved to your inbox');

// Search results and links.
assert.equal(resultLink({ kind: 'transaction', title: 'Swiggy & co' }), '/app/finance/ledger?preset=all&q=Swiggy%20%26%20co');
assert.equal(resultLink({ kind: 'goal', id: 'abc' }), '/app/finance/goals/abc');
assert.equal(resultLink({ kind: 'habit' }), '/app/tasks/habits');
// A person opens the ledger filtered to their payments (all time).
assert.equal(resultLink({ kind: 'person', id: 'abc123' }), '/app/finance/ledger?preset=all&person=abc123');
assert.deepEqual(describeResult({ kind: 'person', title: 'Ramesh', isFamily: true }, today), { kind: 'person', title: 'Ramesh', detail: 'Your circle · Family · Enter to see their payments' });
assert.equal(describeResult({ kind: 'person', title: 'Ramesh', isFamily: false }, today).detail, 'Your circle · Enter to see their payments');
assert.ok(commands.some((c) => c.to === '/app/settings/people' && c.label === 'Your circle'), 'Settings → Your circle is a page command');
assert.equal(resultLink({ kind: 'capture' }), null, 'inbox notes open inside the palette');
assert.equal(describeResult({ kind: 'transaction', title: 'Swiggy', amount: 450, date: '2026-11-10', direction: 'debit' }, today).detail, '₹450 · 10 Nov');
assert.equal(describeResult({ kind: 'task', title: 'x', status: 'open', dueDate: today }, today).detail, 'Due Today');
assert.equal(describeResult({ kind: 'habit', title: 'Gym', streak: 4 }, today).detail, '4-day streak');

// An AI-suggested category is labelled, and only an uncategorised payment makes the palette ask for one.
const suggested = { ...expense, aiCategory: true };
assert.equal(describeAction(suggested, today).detail, 'Cafes & Coffee (AI) · UPI');
assert.equal(describeAction(expense, today).detail, 'Cafes & Coffee · UPI', 'a rules or typed category carries no label');
const bare = { type: 'transaction', data: { ...expense.data, categoryName: undefined, category: undefined } };
assert.equal(needsCategory({ actions: [bare] }), true);
assert.equal(needsCategory({ actions: [{ ...expense, data: { ...expense.data, category: 'c1' } }] }), false);
assert.equal(needsCategory({ actions: [{ type: 'task', data: { title: 'x' } }] }), false, 'tasks never need a category');
assert.equal(needsCategory({ actions: [] }), false);
assert.equal(needsCategory(null), false);
assert.equal(engineFor({ actions: [bare] }, false), 'rules');
assert.equal(engineFor({ actions: [suggested] }, false), 'ai', 'a payment filed by the AI is saved as an AI capture');
assert.equal(engineFor({ actions: [bare] }, true), 'ai');

// Guest mode hides every amount the palette shows.
setGuestMode(true);
assert.doesNotMatch(describeAction(expense, today).title, /40/);
assert.doesNotMatch(savedMessage({ created: [{ type: 'transaction', amount: 40, label: 'Chai' }] }), /40/);
assert.doesNotMatch(describeResult({ kind: 'commitment', title: 'Loan', amount: 12000 }, today).detail, /12/);
setGuestMode(false);

// A palette photo goes on the payment (created or matched), else the task, else the inbox note; never a habit.
assert.deepEqual(photoTarget({ created: [{ type: 'habit', id: 'h1' }, { type: 'task', id: 't1' }, { type: 'transaction', id: 'x1', matched: true }] }), { ownerType: 'transaction', ownerId: 'x1' });
assert.deepEqual(photoTarget({ created: [{ type: 'task', id: 't1' }] }), { ownerType: 'task', ownerId: 't1' });
assert.deepEqual(photoTarget({ created: [], inbox: [{ _id: 'c1' }] }), { ownerType: 'capture', ownerId: 'c1' });
assert.equal(photoTarget({ created: [{ type: 'habit', id: 'h1' }] }), null);
assert.equal(photoTarget({}), null);

console.log('capture UI tests passed');
