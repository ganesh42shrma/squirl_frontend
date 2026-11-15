export const SMS_BANKS = {
  sbi: { label: 'SBI', senders: ['SBIUPI'] },
  kotak: { label: 'Kotak', senders: ['KOTAKB'] },
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
    if (!/^\d{4}$/.test(a.last4)) throw new Error(`Enter the last 4 account digits for ${SMS_BANKS[a.bank].label}.`);
    if (!a.senders.length || a.senders.length > 10 || a.senders.some((s) => !/^[A-Z0-9-]{2,32}$/.test(s))) throw new Error(`Enter 1–10 sender names for ${SMS_BANKS[a.bank].label}.`);
  }
  return { accounts };
}

export const SMS_REASONS = {
  unsupported_format: 'Couldn’t read this message.',
  invalid_amount: 'Couldn’t read the amount.',
  invalid_date: 'Couldn’t read the date.',
  account_not_mapped: 'Account number doesn’t match.',
  date_outside_window: 'Payment is more than a week old.',
  sender_bank_mismatch: 'Sender and bank don’t match.',
  ambiguous_match: 'Matches several entries.',
  reference_conflict: 'Already recorded with different details.',
  statement_conflict: 'Your statement differs; it was used instead.',
  ambiguous_statement: 'Several statement rows match; the statement was used.',
  transaction_deleted: 'You deleted this before, so it wasn’t added again.',
};

export function pairingCode(origin, device, accounts) {
  const url = new URL(origin);
  if (url.protocol !== 'https:') throw new Error('Open Squirl from your secure address to connect a phone.');
  return JSON.stringify({ version: 1, baseUrl: url.origin, token: device.token, accounts });
}
