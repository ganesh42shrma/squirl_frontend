// Real helpers, query hooks and cache; synthetic HTTP only. No production records or tokens.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';

const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
globalThis.window = { location: { origin: 'https://synthetic.tailnet.ts.net', protocol: 'https:' } };
const calls = [];
globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  const data = String(url).includes('/accounts') ? { accounts: [] } : String(url).includes('/devices') ? { devices: [] } : { status: 'captured' };
  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });
};
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const helpers = await server.ssrLoadModule('/src/features/profile/smsSetup.js');
  const hooks = await server.ssrLoadModule('/src/features/profile/useSms.js');
  assert.deepEqual(helpers.SMS_BANKS.sbi.senders, ['VK-SBIUPI-S', 'AD-SBIUPI-S']);
  assert.deepEqual(helpers.SMS_BANKS.kotak.senders, ['JM-KOTAKB-S', 'JD-KOTAKB-S', 'JX-KOTAKB-S']);
  const draft = helpers.accountDraft();
  assert.equal(draft.sbi.last4, '', 'do not hardcode a personal account');
  assert.equal(draft.kotak.enabled, false);
  assert.throws(() => helpers.accountsPayload(draft), /last four/);
  draft.sbi.last4 = '1111';
  const payload = helpers.accountsPayload(draft);
  assert.deepEqual(payload.accounts, [{ bank: 'sbi', last4: '1111', senders: ['VK-SBIUPI-S', 'AD-SBIUPI-S'] }]);
  draft.sbi.senders = 'vk-sbiupi-s, AD-SBIUPI-S\nvk-sbiupi-s';
  assert.deepEqual(helpers.accountsPayload(draft), payload);
  draft.sbi.senders = 'not:a:sender';
  assert.throws(() => helpers.accountsPayload(draft), /exact sender/);
  const saved = helpers.accountDraft([{ bank: 'kotak', last4: '2222', senders: ['CUSTOM-KOTAK-S'] }]);
  assert.equal(saved.kotak.saved, true);
  assert.equal(saved.kotak.last4, '2222');
  assert.equal(saved.kotak.senders, 'CUSTOM-KOTAK-S', 'saved IDs take priority over presets');
  assert.throws(() => helpers.pairingCode('http://localhost:4000', { token: 'synthetic-token' }, payload.accounts), /HTTPS/);
  const code = JSON.parse(helpers.pairingCode(window.location.origin, { token: 'synthetic-token' }, payload.accounts));
  assert.equal(code.baseUrl, window.location.origin);
  assert.equal(code.token, 'synthetic-token');
  assert.deepEqual(code.accounts, payload.accounts);

  for (const [hook, variables, method, path] of [
    [hooks.useSaveSmsAccounts, payload, 'PUT', '/sms/accounts'],
    [hooks.useRevokeSmsDevice, 'synthetic-device', 'DELETE', '/sms/devices/synthetic-device'],
    [hooks.useResolveSms, { id: 'synthetic-event' }, 'POST', '/sms/events/synthetic-event/dismiss'],
    [hooks.useResolveSms, { id: 'synthetic-event', fields: { amount: 1 } }, 'POST', '/sms/events/synthetic-event/confirm'],
  ]) {
    const client = new QueryClient();
    const keys = ['sms', 'transactions', 'summary', 'insights', 'commitments', 'goals', 'profile'];
    keys.forEach((key) => client.setQueryData([key], { synthetic: true }));
    let mutation;
    function Probe() { mutation = hook(); return null; }
    renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Probe)));
    await mutation.mutateAsync(variables);
    const call = calls.at(-1);
    assert.equal(call.options.method, method);
    assert.ok(call.url.endsWith(`/api${path}`));
    assert.equal(call.options.headers['X-Requested-With'], 'squirl');
    for (const key of keys) assert.equal(client.getQueryState([key]).isInvalidated, true, `${path} refreshes ${key}`);
    assert.equal(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data)).includes('synthetic-token'), false);
    client.clear();
  }
  const { BankSms } = await server.ssrLoadModule('/src/features/profile/BankSms.jsx');
  const client = new QueryClient();
  client.setQueryData(['sms', 'accounts'], []);
  client.setQueryData(['sms', 'devices'], []);
  client.setQueryData(['sms', 'review', 1], { items: [], meta: { total: 0, page: 1, pages: 0 } });
  const markup = renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(BankSms)));
  assert.match(markup, /VK-SBIUPI-S/);
  assert.match(markup, /AD-SBIUPI-S/);
  assert.match(markup, /Save bank setup/);
  assert.match(markup, /Save your bank setup first/);
  assert.match(markup, /No messages need review/);
  assert.doesNotMatch(markup, /synthetic-token/);
  client.clear();
  console.log('SMS UI: exact sender presets, account validation, HTTPS pairing payload, saved settings, query invalidation and initial markup passed.');
} finally {
  await server.close(); globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
}
