// Exercise the real mutation hooks with synthetic responses and a real React Query cache.
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
globalThis.window = { location: { origin: 'https://squirl.example.invalid' } };
globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const transactions = await server.ssrLoadModule('/src/features/ledger/useTransactions.js');
  const imports = await server.ssrLoadModule('/src/features/imports/useImports.js');
  const commitments = await server.ssrLoadModule('/src/features/commitments/useCommitments.js');
  const queries = [['commitments'], ['commitments', 'alerts'], ['commitments', 'schedule', 'loan'], ['commitments', 'detected'], ['goals']];
  for (const [name, hook, variables] of [
    ['create transaction', transactions.useCreateTransaction, { amount: 100 }],
    ['edit transaction', transactions.useUpdateTransaction, { id: 'synthetic', category: 'category' }],
    ['bulk edit', transactions.useBulkUpdateTransactions, { ids: ['synthetic'], set: { category: 'category' } }],
    ['delete transaction', transactions.useDeleteTransactions, ['synthetic']],
    ['import statement', imports.useCreateImport, { file: new Blob(['synthetic'], { type: 'application/pdf' }), bank: 'sbi' }],
    ['undo import', imports.useDeleteImport, 'synthetic'],
    ['edit loan', commitments.useSaveCommitment, { id: 'synthetic', matchKey: 'SYNTHETIC LENDER' }],
    ['delete loan', commitments.useDeleteCommitment, 'synthetic'],
  ]) {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    for (const key of queries) client.setQueryData(key, { synthetic: true });
    let mutation;
    function Probe() { mutation = hook(); return null; }
    renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Probe)));
    await mutation.mutateAsync(variables);
    for (const key of queries) assert.equal(client.getQueryState(key).isInvalidated, true, `${name} refreshes ${key.join('/')}`);
    client.clear();
  }
  console.log('Passed: ledger create/edit/bulk/delete, statement import/undo, and loan edit/delete invalidate payment status, alerts, schedules, recurring detection, and linked goals.');
} finally {
  await server.close();
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
