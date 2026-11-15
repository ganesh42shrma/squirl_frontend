// Exercise the real footer query and markup with a mock network; no paid AI calls.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { createServer } from 'vite';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
globalThis.window = { location: { origin: 'https://squirl.example.invalid' } };
const calls = [];
globalThis.fetch = (url, options) => new Promise((resolve) => calls.push({ url, options, resolve }));
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const client = new QueryClient();
const waitFor = async (test) => {
  for (let i = 0; i < 100; i += 1) {
    if (test()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail('Timed out waiting for the quote query');
};
const respond = (index, data, status = 200) => calls[index].resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
let unsubscribe;
try {
  const { QuoteFooter } = await server.ssrLoadModule('/src/components/layout/QuoteFooter.jsx');
  const markup = () => renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(QuoteFooter)));
  assert.match(markup(), /Just take the next honest step/);
  assert.doesNotMatch(markup(), /<button|Original AI line|quote-footer__source/);
  const query = client.getQueryCache().find({ queryKey: ['quote'] });
  assert.equal(query.options.retry, false);
  assert.equal(query.options.refetchOnWindowFocus, false);
  assert.equal(query.options.refetchOnReconnect, false);
  const observer = new QueryObserver(client, query.options);
  unsubscribe = observer.subscribe(() => {});
  await waitFor(() => calls.length === 1);
  // Strict Mode unmounts and remounts while the first completion is in flight.
  unsubscribe();
  unsubscribe = observer.subscribe(() => {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['X-Requested-With'], 'squirl');
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.match(markup(), /aria-busy="true"/);
  respond(0, { success: true, data: { text: 'Keep walking, even when the mountain is quiet.', style: 'Anime-inspired' } });
  await waitFor(() => query.state.status === 'success');
  assert.match(markup(), /Keep walking/);
  assert.doesNotMatch(markup(), /<button|Original AI line|Anime-inspired/);

  const refresh = observer.refetch({ cancelRefetch: false });
  const duplicate = observer.refetch({ cancelRefetch: false });
  await waitFor(() => calls.length === 2);
  assert.equal(JSON.parse(calls[1].options.body).previous, query.state.data.text);
  assert.match(markup(), /Keep walking/);
  respond(1, { success: true, data: { text: 'Choose the next step that is within your control.', style: 'Stoic-inspired' } });
  await Promise.all([refresh, duplicate]);
  assert.equal(calls.length, 2, 'rapid refreshes share the pending request');
  assert.match(markup(), /Choose the next step/);
  assert.doesNotMatch(markup(), /<button|Original AI line|Stoic-inspired/);

  const failedRefresh = observer.refetch({ cancelRefetch: false });
  await waitFor(() => calls.length === 3);
  respond(2, { success: false, error: { message: 'Synthetic outage', code: 'LLM_UNAVAILABLE' } }, 503);
  await failedRefresh;
  assert.match(markup(), /Choose the next step/);
  assert.doesNotMatch(markup(), /Try again|<button/);
  assert.equal(calls.length, 3, 'no automatic retries on a failed completion');

  unsubscribe();
  client.clear();
  markup();
  const emptyQuery = client.getQueryCache().find({ queryKey: ['quote'] });
  const emptyObserver = new QueryObserver(client, emptyQuery.options);
  unsubscribe = emptyObserver.subscribe(() => {});
  await waitFor(() => calls.length === 4);
  respond(3, { success: false, error: { message: 'Synthetic outage' } }, 503);
  await waitFor(() => emptyQuery.state.status === 'error');
  assert.match(markup(), /Just take the next honest step/);
  assert.doesNotMatch(markup(), /<button|Original AI line|Try again/);
  console.log('Quote footer: automatic generation, no refresh button or attribution, remount deduplication and fallback passed.');
} finally {
  unsubscribe?.();
  client.clear();
  await server.close();
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
