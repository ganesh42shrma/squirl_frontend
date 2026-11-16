// Your circle's plain logic, with no React, so it is easy to test in Node.

/** "9000000001" → "+91 90000 00001". Anything that isn't a 10-digit number is shown as it was. */
export function formatPhone(phone = '') {
  return /^\d{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

/** What someone types → the 10-digit national number (drops +91 / 91 / 0 and any spaces or dashes). */
export function localPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('0091')) return digits.slice(4);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export const isMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

export const initialOf = (name = '') => ([...name.trim()][0] || '?').toUpperCase();

/** The grey line under a name: "Family · Sister · +91 90000 00001 · +91 …". */
export function personSubtitle(person) {
  return [person.isFamily ? 'Family' : null, person.isFamily ? person.relationship : null, ...person.phones.map(formatPhone)].filter(Boolean).join(' · ');
}

const count = (n, one, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/**
 * The import result as short sentences: what was added, merged and left alone, and what was skipped and why.
 * Nothing is ever marked family by an import, so that is said once, plainly.
 */
export function describeImport(summary) {
  const lines = [];
  if (summary.added) lines.push(`Added ${count(summary.added, 'person', 'people')}.`);
  if (summary.merged) lines.push(`Added new numbers to ${count(summary.merged, 'person', 'people')} you already had.`);
  // heldBack contacts are counted inside `unchanged` by the server; they get their own sentence here.
  const held = summary.heldBack || 0;
  const same = (summary.unchanged || 0) - held;
  if (same > 0) lines.push(`${count(same, 'contact')} already in your circle.`);
  if (held) {
    lines.push(`Kept existing numbers for ${count(held, 'family member')}. Edit them to add numbers; this can change payment categories.`);
  }
  if (summary.skipped) lines.push(`Skipped ${count(summary.skipped, 'contact')} with no name or no Indian mobile number.`);
  if (!lines.length) lines.push('That file had no contacts in it.');
  return lines;
}

/**
 * The editor's form → the body the API wants. Relationship and alternate names are only shown (and only matter)
 * for family, but unticking Family keeps them, exactly as the Family switch in the list does: ticking it again
 * later brings them back instead of making someone retype them.
 */
export function personBody(form) {
  const phones = [...new Set(form.phones.map(localPhone).filter(Boolean))];
  return {
    name: form.name.trim(),
    phones,
    isFamily: form.isFamily,
    relationship: form.relationship,
    aliases: [...new Set(form.aliases.split(',').map((a) => a.trim()).filter(Boolean))],
  };
}

/** What to say after the Family switch is flipped for someone. */
export const familyToast = (name, isFamily) => (isFamily ? `${name} is family. Updating past payments…` : `${name} is no longer family. Updating past payments…`);

export const personDraft = (person) => ({
  name: person?.name || '',
  phones: person?.phones?.length ? [...person.phones] : [''],
  isFamily: Boolean(person?.isFamily),
  relationship: person?.relationship || '',
  aliases: (person?.aliases || []).join(', '),
});

/** The first thing wrong with a form, in plain words, or ''. (The server checks everything again.) */
export function draftProblem(form) {
  if (form.name.trim().length < 2) return 'Enter a name with at least 2 letters.';
  const bad = form.phones.map(localPhone).filter(Boolean).find((p) => !isMobile(p));
  return bad ? 'Phone numbers must be 10-digit Indian mobile numbers.' : '';
}

/** How "Who is this?" describes the way a payment is currently labelled. */
export function labelHint(person) {
  if (!person) return '';
  return person.via === 'phone'
    ? 'Matched by the phone number in the UPI id. To change it, edit that person’s numbers in Your circle.'
    : 'You linked this payment’s UPI id or payee name to them.';
}

/** The "→ Ramesh" label shown on a payment. */
export const personLabel = (person) => (person ? `→ ${person.name}` : '');
