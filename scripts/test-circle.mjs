// Your circle's plain logic: phone formatting and entry, how an import result reads, the editor's form <-> API body,
// and how "Who is this?" describes a label. No React, no network.
import assert from 'node:assert/strict';
import { describeImport, draftProblem, familyToast, formatPhone, initialOf, isMobile, labelHint, localPhone, personBody, personDraft, personLabel, personSubtitle } from '../src/features/circle/circleModel.js';

// Phones: shown as +91 xxxxx xxxxx, typed in any common way, kept as 10 digits.
assert.equal(formatPhone('9000000001'), '+91 90000 00001');
assert.equal(formatPhone('12345'), '12345', 'anything else is shown as it was');
for (const typed of ['9000000001', '+91 90000 00001', '91-9000000001', '00919000000001', '09000000001', ' 90000-00001 ']) assert.equal(localPhone(typed), '9000000001', typed);
assert.equal(isMobile('9000000001'), true);
assert.equal(isMobile('5000000001'), false);
assert.equal(isMobile('900000001'), false);

// Names and the line under them.
assert.equal(initialOf('  ramesh'), 'R');
assert.equal(initialOf('रमेश'), 'र');
assert.equal(initialOf(''), '?');
assert.equal(personSubtitle({ isFamily: true, relationship: 'Sister', phones: ['9000000001', '9000000002'] }), 'Family · Sister · +91 90000 00001 · +91 90000 00002');
assert.equal(personSubtitle({ isFamily: false, relationship: 'Sister', phones: ['9000000001'] }), '+91 90000 00001', 'a relationship only shows for family');
assert.equal(personSubtitle({ isFamily: false, relationship: '', phones: [] }), '');

// The import result, in plain words.
assert.deepEqual(describeImport({ cards: 3, added: 1, merged: 0, unchanged: 0, skipped: 2, heldBack: 0 }), ['Added 1 person.', 'Skipped 2 contacts with no name or no Indian mobile number.']);
assert.deepEqual(describeImport({ cards: 400, added: 212, merged: 1, unchanged: 40, skipped: 31, heldBack: 0 }), [
  'Added 212 people.', 'Added new numbers to 1 person you already had.', '40 contacts already in your circle.', 'Skipped 31 contacts with no name or no Indian mobile number.',
]);
// Family members whose extra numbers were held back are explained once, and not also counted as "already in your circle".
assert.deepEqual(describeImport({ cards: 2, added: 0, merged: 0, unchanged: 2, skipped: 0, heldBack: 1 }), [
  '1 contact already in your circle.',
  '1 family member has other numbers in your phone book. Those weren’t added, because a family member’s numbers decide which payments go to Family. To add one, use Edit next to their name.',
]);
assert.deepEqual(describeImport({ cards: 3, added: 0, merged: 0, unchanged: 3, skipped: 0, heldBack: 3 }).map((l) => l.slice(0, 26)), ['3 family members have othe']);
assert.deepEqual(describeImport({ cards: 0, added: 0, merged: 0, unchanged: 0, skipped: 0, heldBack: 0 }), ['That file had no contacts in it.']);
assert.equal(describeImport({ added: 1200, merged: 0, unchanged: 0, skipped: 0, heldBack: 0, cards: 1200 })[0], 'Added 1,200 people.');

// The editor: draft from a person, body for the API. Relationship and statement names only go with family.
assert.deepEqual(personDraft(), { name: '', phones: [''], isFamily: false, relationship: '', aliases: '' });
const draft = personDraft({ name: 'Ananya', phones: ['9000000001'], isFamily: true, relationship: 'Sister', aliases: ['Ananya S', 'A Sharma'] });
assert.equal(draft.aliases, 'Ananya S, A Sharma');
assert.deepEqual(personBody({ ...draft, name: '  Ananya Sharma ', phones: ['+91 90000 00001', '9000000001', '', '9000000002'], aliases: 'Ananya S, ,A Sharma, Ananya S' }), {
  name: 'Ananya Sharma', phones: ['9000000001', '9000000002'], isFamily: true, relationship: 'Sister', aliases: ['Ananya S', 'A Sharma'],
});
assert.deepEqual(personBody({ ...draft, isFamily: false }), { name: 'Ananya', phones: ['9000000001'], isFamily: false, relationship: 'Sister', aliases: ['Ananya S', 'A Sharma'] }, 'unticking Family keeps the relationship and statement names for later');
assert.equal(familyToast('Ananya', true), 'Ananya is family. Updating past payments…');
assert.equal(familyToast('Ananya', false), 'Ananya is no longer family. Updating past payments…');
assert.equal(draftProblem({ ...draft, name: 'A' }), 'Enter a name with at least 2 letters.');
assert.equal(draftProblem({ ...draft, phones: ['12345'] }), 'Phone numbers must be 10-digit Indian mobile numbers.');
assert.equal(draftProblem({ ...draft, phones: [''] }), '', 'numbers are optional');
assert.equal(draftProblem(draft), '');

// Labels on a payment.
assert.equal(personLabel({ name: 'Ramesh' }), '→ Ramesh');
assert.equal(personLabel(null), '');
assert.match(labelHint({ via: 'phone' }), /phone number/);
assert.match(labelHint({ via: 'link' }), /You linked/);
assert.equal(labelHint(null), '');
console.log('Passed: phone entry and display, import summary wording, editor draft/body rules, link labels.');
