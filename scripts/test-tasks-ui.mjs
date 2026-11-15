import assert from 'node:assert/strict';
import { describeEvents } from '../src/features/tasks/systemEvents.js';
import { addDaysKey, cadenceText, daysBetween, dueLabel, repeatId, streakUnit } from '../src/features/tasks/taskUtils.js';

const kinds = (events) => describeEvents(events).map((n) => [n.kind, n.title]);

// One response with a task completion, an award it unlocked and a level-up becomes three notices; the XP
// paid by the award is part of the award's own notice, so it is not counted twice.
const notices = describeEvents([
  { type: 'xp', amount: 48, reason: 'task', label: 'File taxes', tier: 'hard' },
  { type: 'xp', amount: 25, reason: 'achievement' },
  { type: 'achievement', id: 'first_step', name: 'First Step', rarity: 'common', xp: 25 },
  { type: 'level_up', level: 2, from: 1 },
]);
assert.deepEqual(notices.map((n) => n.kind), ['xp', 'award', 'level'], 'in the order the server reported them');
assert.equal(notices[0].body, 'File taxes · +48 XP'); assert.equal(notices[0].title, '[ QUEST CLEARED ]');
assert.equal(notices[2].body, 'You are now Lv. 2.'); assert.equal(notices[1].body, 'First Step · +25 XP');
assert.equal(new Set(notices.map((n) => n.id)).size, 3, 'each notice has its own id');

// Several completions in one go are summed; a reversal says so; ticking a habit reads as a habit.
assert.equal(describeEvents([{ type: 'xp', amount: 10, reason: 'task' }, { type: 'xp', amount: 5, reason: 'subtask' }])[0].body, '+15 XP');
assert.deepEqual(kinds([{ type: 'xp', amount: -48, reason: 'reversal' }]), [['xp', '[ XP REVERSED ]']]);
assert.deepEqual(kinds([{ type: 'xp', amount: 10, reason: 'habit', label: 'Read' }]), [['xp', '[ HABIT LOGGED ]']]);
assert.deepEqual(kinds([{ type: 'xp', amount: 1, reason: 'checklist' }]), [['xp', '[ STEP DONE ]']]);
assert.deepEqual(kinds([]), []);

// Daily Quest, penalty, chain, streak and rank messages (original copy), and the quiet ones stay quiet.
const cleared = describeEvents([{ type: 'daily_quest_cleared', chain: 18, xp: 50 }])[0];
assert.equal(cleared.title, '[ DAILY QUEST CLEARED ]'); assert.match(cleared.body, /18 days · \+50 XP/);
assert.match(describeEvents([{ type: 'daily_quest_cleared', chain: 1, xp: 50 }])[0].body, /1 day /);
const penalty = describeEvents([{ type: 'penalty_open', title: 'Extra 20-minute walk', due: '2026-11-15', missedOn: '2026-11-14' }])[0];
assert.equal(penalty.tone, 'red'); assert.match(penalty.body, /Extra 20-minute walk/);
assert.match(describeEvents([{ type: 'daily_chain_broken', was: 12 }])[0].body, /XP and level are untouched/);
assert.deepEqual(kinds([{ type: 'streak', name: 'Read', value: 5, milestone: false }]), [], 'only milestones toast');
assert.deepEqual(kinds([{ type: 'streak', name: 'Read', value: 7, milestone: true }]), [['streak', '[ STREAK ]']]);
assert.match(describeEvents([{ type: 'streak_protected', name: 'Read', freezesLeft: 1 }])[0].body, /Freezes left: 1/);
assert.deepEqual(kinds([{ type: 'rank_trial_open', rank: 'D', name: 'D-Rank' }]), [['quest', '[ GATE OPENED ]']]);
const rank = describeEvents([{ type: 'rank_up', rank: 'C', name: 'C-Rank' }])[0];
assert.equal(rank.kind, 'rank'); assert.equal(rank.rank, 'C');
assert.equal(describeEvents([{ type: 'warning', code: 'daily_cap' }])[0].title, '[ WARNING ]');
assert.deepEqual(kinds([{ type: 'warning', code: 'something_else' }, { type: 'mystery' }]), [], 'unknown events are ignored, not crashed on');

// Day maths and labels.
assert.equal(addDaysKey('2026-02-27', 2), '2026-03-01'); assert.equal(daysBetween('2026-03-01', '2026-03-31'), 30);
assert.deepEqual(dueLabel('2026-03-10', '2026-03-10'), { text: 'Today', tone: 'today' });
assert.deepEqual(dueLabel('2026-03-11', '2026-03-10'), { text: 'Tomorrow', tone: 'soon' });
assert.deepEqual(dueLabel('2026-03-07', '2026-03-10'), { text: '3 days late', tone: 'late' });
assert.equal(dueLabel('2026-03-09', '2026-03-10').text, 'Yesterday'); assert.equal(dueLabel(null, '2026-03-10'), null);
assert.equal(dueLabel('2026-04-30', '2026-03-10').tone, 'later');
assert.equal(repeatId(null), ''); assert.equal(repeatId({ freq: 'weekly', interval: 1 }), 'weekly'); assert.equal(repeatId({ freq: 'weekly', interval: 1, days: [1, 3] }), 'custom');
assert.equal(cadenceText({ cadence: 'daily' }), 'Every day'); assert.equal(cadenceText({ cadence: 'weekdays', daysMask: 31 }), 'Weekdays');
assert.equal(cadenceText({ cadence: 'weekdays', daysMask: 0b0010101 }), 'Mon, Wed, Fri');
assert.equal(cadenceText({ cadence: 'times_per_week', targetPerPeriod: 3 }), '3 times a week'); assert.equal(cadenceText({ cadence: 'every_n_days', everyN: 3 }), 'Every 3 days');
assert.equal(streakUnit({ cadence: 'times_per_week' }, 1), 'week'); assert.equal(streakUnit({ cadence: 'daily' }, 12), 'days');
console.log('Passed: System notices from API events (XP, levels, awards, quests, penalties, streaks, ranks), unknown-event safety, due labels and cadence text.');
