export const SMS_BANKS = {
  sbi: { label: 'SBI', senders: ['VK-SBIUPI-S', 'AD-SBIUPI-S'] },
  kotak: { label: 'Kotak', senders: ['JM-KOTAKB-S', 'JD-KOTAKB-S', 'JX-KOTAKB-S'] },
};

export const senderIds = (text) => [...new Set(text.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];

export function accountDraft(accounts = []) {
  return Object.fromEntries(Object.entries(SMS_BANKS).map(([bank, preset]) => {
    const saved = accounts.find((a) => a.bank === bank);
    return [bank, { enabled: Boolean(saved) || bank === 'sbi', saved: Boolean(saved), last4: saved?.last4 || '', senders: (saved?.senders || preset.senders).join('\n') }];
  }));
}

export function accountsPayload(draft) {
  const accounts = Object.entries(draft).filter(([, a]) => a.enabled).map(([bank, a]) => ({ bank, last4: a.last4.trim(), senders: senderIds(a.senders) }));
  if (!accounts.length) throw new Error('Choose at least one bank.');
  for (const a of accounts) {
    if (!/^\d{4}$/.test(a.last4)) throw new Error(`Enter the last four account digits for ${SMS_BANKS[a.bank].label}.`);
    if (!a.senders.length || a.senders.length > 10 || a.senders.some((s) => !/^[A-Z0-9-]{2,32}$/.test(s))) throw new Error(`Enter 1–10 exact sender IDs for ${SMS_BANKS[a.bank].label}.`);
  }
  return { accounts };
}

export const SMS_REASONS = {
  unsupported_format: 'This message format needs review.',
  invalid_amount: 'The amount could not be read safely.',
  invalid_date: 'The transaction date could not be read safely.',
  account_not_mapped: 'The account suffix does not match your bank setup.',
  date_outside_window: 'The payment date is outside the seven-day receipt window.',
  sender_bank_mismatch: 'The sender and bank named in the message do not match.',
  ambiguous_match: 'Several ledger entries could match this payment.',
  reference_conflict: 'The reference exists with different payment details.',
  statement_conflict: 'The statement differs from this provisional SMS entry. Statement figures are used.',
  ambiguous_statement: 'Several statement rows could match this SMS. Statement figures are used.',
  transaction_deleted: 'This SMS payment was previously deleted and was not added again.',
};

export function pairingCode(origin, device, accounts) {
  const url = new URL(origin);
  if (url.protocol !== 'https:') throw new Error('Open Squirl at your private HTTPS address to create a pairing code.');
  return JSON.stringify({ version: 1, baseUrl: url.origin, token: device.token, accounts });
}
