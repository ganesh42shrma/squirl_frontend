// Photo attachments UI: image maths and validation, the query hooks (endpoints, headers, invalidation, no image
// bytes in any cache), panel markup, and where the panel is mounted. Synthetic data and fake fetch only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createServer } from 'vite';

const originalFetch = globalThis.fetch, originalWindow = globalThis.window, originalBitmap = globalThis.createImageBitmap, originalDocument = globalThis.document;
globalThis.window = { location: { origin: 'https://synthetic.tailnet.ts.net', protocol: 'https:' } };
const calls = [];
let respond = () => ({ status: 200, body: { success: true, data: {} } });
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  const { status, body } = respond(String(url), options);
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
};
const ID = 'a'.repeat(24), OTHER = 'b'.repeat(24), MEDIA = 'c'.repeat(24);
const attachment = (n, extra = {}) => ({ id: n.toString(16).padStart(24, '0'), mediaId: `${n}`.padStart(24, 'd'), ownerType: 'task', ownerId: ID, mime: 'image/jpeg', size: 1000, width: 10, height: 10, createdAt: '2026-11-01T00:00:00Z', ...extra });

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const tools = await server.ssrLoadModule('/src/features/media/imageTools.js');
  const hooks = await server.ssrLoadModule('/src/features/media/useMedia.js');
  const panel = await server.ssrLoadModule('/src/features/media/AttachmentsPanel.jsx');

  // ---- pure image maths ----
  assert.deepEqual(tools.fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(tools.fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
  assert.deepEqual(tools.fitWithin(1000, 500, 2000), { width: 1000, height: 500 }, 'never enlarged');
  assert.deepEqual(tools.fitWithin(2000, 2000, 2000), { width: 2000, height: 2000 });
  assert.deepEqual(tools.fitWithin(2001, 1, 2000), { width: 2000, height: 1 }, 'never below 1 px');
  assert.deepEqual(tools.fitWithin(10000, 1, 2000), { width: 2000, height: 1 });
  assert.deepEqual(tools.fitWithin(0, 0), { width: 1, height: 1 });
  assert.deepEqual(tools.fitWithin(NaN, 5), { width: 1, height: 1 });
  assert.deepEqual(tools.fitWithin(5000, 2500), { width: 2000, height: 1000 }, 'default max is 2000');

  // ---- validation ----
  const file = (type, size = 1000, name = 'x.jpg') => ({ type, size, name });
  for (const ok of [file('image/jpeg'), file('image/png'), file('image/webp'), file('image/heic'), file('IMAGE/JPEG'), file('', 500, 'IMG_1.HEIC')]) assert.equal(tools.validateImageFile(ok), null);
  for (const bad of [file('application/pdf'), file('image/svg+xml'), file('image/gif'), file('text/html'), file('', 500, 'notes.pdf'), file('image/jpeg', 0), file('image/jpeg', 31 * 1024 * 1024)]) {
    assert.equal(typeof tools.validateImageFile(bad), 'string', JSON.stringify(bad));
  }
  assert.equal(typeof tools.validateImageFile(null), 'string');
  assert.equal(tools.validateImageFile(file('image/jpeg', 5000), { maxBytes: 4000 }).includes('too big'), true);
  assert.match(tools.validateImageFile(file('application/pdf')), /isn’t a photo/);

  // ---- compressImage: scaled, re-encoded as JPEG on a white canvas, no leftovers ----
  const record = { drawn: null, fills: [], released: 0, blobArgs: null, canvas: null };
  const fakeEnv = (width, height, blob = new Blob(['x'.repeat(10)], { type: 'image/jpeg' })) => ({
    decode: async () => ({ source: 'decoded-bitmap', width, height, release: () => { record.released += 1; } }),
    canvas: (w, h) => { record.canvas = { w, h }; return { getContext: () => ({ fillStyle: '', fillRect: (...a) => record.fills.push(a), drawImage: (...a) => { record.drawn = a; } }) }; },
    toBlob: async (_c, type, quality) => { record.blobArgs = { type, quality }; return blob; },
  });
  const out = await tools.compressImage({ name: 'IMG_9.heic', type: 'image/heic', size: 5 }, { env: fakeEnv(4032, 3024) });
  assert.equal(out.type, 'image/jpeg'); assert.deepEqual(record.canvas, { w: 2000, h: 1500 });
  assert.deepEqual(record.blobArgs, { type: 'image/jpeg', quality: 0.82 });
  assert.deepEqual(record.drawn, ['decoded-bitmap', 0, 0, 2000, 1500]); assert.deepEqual(record.fills[0], [0, 0, 2000, 1500]);
  assert.equal(record.released, 1);
  await tools.compressImage({}, { env: fakeEnv(800, 600) }); assert.deepEqual(record.canvas, { w: 800, h: 600 });
  await assert.rejects(tools.compressImage({}, { env: { ...fakeEnv(1, 1), decode: async () => { throw new Error('decode failed'); } } }), (e) => e.name === 'ImageError' && /couldn’t read that photo/.test(e.message));
  await assert.rejects(tools.compressImage({}, { env: fakeEnv(1, 1, null) }), (e) => e.name === 'ImageError');
  await assert.rejects(tools.compressImage({}, { env: fakeEnv(0, 0) }), (e) => e.name === 'ImageError');
  // The real browser path asks for the camera's rotation to be applied.
  let bitmapOptions; let canvasCreated;
  globalThis.createImageBitmap = async (_f, options) => { bitmapOptions = options; return { width: 3000, height: 1000, close() {} }; };
  globalThis.document = { createElement: (tag) => { canvasCreated = tag; return { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (cb, type, q) => cb(new Blob(['j'], { type })) }; } };
  const viaBrowser = await tools.compressImage({ name: 'a.jpg', type: 'image/jpeg', size: 1 });
  assert.deepEqual(bitmapOptions, { imageOrientation: 'from-image' }); assert.equal(canvasCreated, 'canvas'); assert.equal(viaBrowser.type, 'image/jpeg');

  // ---- hooks: endpoints, methods, headers, invalidation ----
  const mount = (client, hook) => {
    let value;
    const Probe = () => { value = hook(); return null; };
    renderToString(React.createElement(QueryClientProvider, { client }, React.createElement(Probe)));
    return () => value;
  };
  const owned = ['media', 'attachments', 'task', ID], other = ['media', 'attachments', 'task', OTHER], status = ['media', 'status'];
  const seed = (client) => { for (const key of [owned, other, ['transactions']]) client.setQueryData(key, { synthetic: true }); };
  const invalidated = (client, key) => client.getQueryState(key).isInvalidated;

  assert.ok(hooks.mediaFileUrl(MEDIA).endsWith(`/api/media/${MEDIA}/file`));
  assert.equal(hooks.mediaFileUrl(MEDIA).includes('blob:'), false);

  let client = new QueryClient(); seed(client);
  const upload = mount(client, hooks.useUploadAttachment);
  calls.length = 0;
  respond = () => ({ status: 201, body: { success: true, data: { attachment: attachment(1) } } });
  // A File carrying a real-looking name, to prove that name is not what gets sent.
  const blob = new File(['SYNTHETIC-IMAGE-BYTES'], 'IMG_20261101_Receipt.jpg', { type: 'image/jpeg' });
  const saved = await upload().upload('task', ID, blob);
  assert.equal(saved.id, attachment(1).id);
  let call = calls.at(-1);
  assert.equal(call.options.method, 'POST'); assert.ok(call.url.endsWith('/api/media/upload'));
  assert.equal(call.options.headers['X-Requested-With'], 'squirl');
  assert.equal(call.options.headers['Content-Type'], undefined, 'the browser sets the multipart boundary');
  assert.ok(call.options.body instanceof FormData);
  assert.equal(call.options.body.get('ownerType'), 'task'); assert.equal(call.options.body.get('ownerId'), ID);
  assert.equal(call.options.body.get('file').name, 'receipt.jpg', 'a generic name, never the real file name');
  assert.equal(invalidated(client, owned), true); assert.equal(invalidated(client, other), false); assert.equal(invalidated(client, ['transactions']), false);
  // No image bytes anywhere in the caches, mutation variables included.
  const holdsBlob = (value) => { const seen = new Set(); const walk = (v) => { if (v instanceof Blob) return true; if (v && typeof v === 'object' && !seen.has(v)) { seen.add(v); return Object.values(v).some(walk); } return false; }; return walk(value); };
  assert.equal(client.getMutationCache().getAll().some((m) => holdsBlob(m.state.variables) || holdsBlob(m.state.data)), false, 'mutation cache holds no Blob');
  assert.equal(client.getQueryCache().getAll().some((q) => holdsBlob(q.state.data)), false);
  assert.equal(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data)).includes('SYNTHETIC-IMAGE-BYTES'), false);
  // A failed upload surfaces the server's message and still holds nothing.
  respond = () => ({ status: 409, body: { success: false, error: { message: 'You can attach up to 10 photos here.', code: 'MEDIA_LIMIT_REACHED' } } });
  await assert.rejects(upload().upload('task', ID, blob), /up to 10 photos/);
  client.clear();

  client = new QueryClient(); seed(client);
  const remove = mount(client, hooks.useRemoveAttachment);
  respond = () => ({ status: 200, body: { success: true, data: null } });
  await remove().mutateAsync({ id: attachment(2).id, ownerType: 'task', ownerId: ID });
  call = calls.at(-1);
  assert.equal(call.options.method, 'DELETE'); assert.ok(call.url.endsWith(`/api/media/attachments/${attachment(2).id}`));
  assert.equal(call.options.headers['X-Requested-With'], 'squirl');
  assert.equal(invalidated(client, owned), true); assert.equal(invalidated(client, other), false);
  client.clear();

  client = new QueryClient();
  mount(client, () => hooks.useAttachments('goal', ID));
  respond = () => ({ status: 200, body: { success: true, data: { attachments: [attachment(3)] } } });
  const goalQuery = client.getQueryCache().find({ queryKey: ['media', 'attachments', 'goal', ID] });
  assert.ok(goalQuery, 'the list is cached per owner type and id');
  assert.deepEqual(await goalQuery.fetch(), [attachment(3)]);
  call = calls.at(-1);
  assert.equal(call.options.method, 'GET'); assert.ok(call.url.includes('/api/media/attachments?')); assert.ok(call.url.includes('ownerType=goal') && call.url.includes(`ownerId=${ID}`));
  client.clear();
  // Disabled until there is a saved owner.
  client = new QueryClient(); calls.length = 0;
  mount(client, () => hooks.useAttachments('task', undefined));
  assert.equal(calls.length, 0); client.clear();

  client = new QueryClient();
  mount(client, hooks.useMediaStatus);
  const statusQuery = client.getQueryCache().find({ queryKey: status });
  respond = () => ({ status: 200, body: { success: true, data: { configured: true, maxBytes: 5, maxPerOwner: 4 } } });
  assert.deepEqual(await statusQuery.fetch(), { configured: true, maxBytes: 5, maxPerOwner: 4 });
  assert.ok(calls.at(-1).url.endsWith('/api/media/status'));
  respond = () => ({ status: 503, body: { success: false, error: { message: 'off', code: 'MEDIA_NOT_CONFIGURED' } } });
  assert.deepEqual(await statusQuery.fetch(), { configured: false }, '503 means the feature is unavailable, not an error');
  respond = () => ({ status: 500, body: { success: false, error: { message: 'boom', code: 'INTERNAL_ERROR' } } });
  await assert.rejects(statusQuery.fetch(), /boom/);
  client.clear();

  // ---- panel markup ----
  const render = (setup, props = {}, { view = false } = {}) => {
    const c = new QueryClient();
    setup(c);
    const Component = view ? panel.AttachmentsPanelView : panel.AttachmentsPanel;
    const html = renderToString(React.createElement(QueryClientProvider, { client: c }, React.createElement(Component, { ownerType: 'task', ownerId: ID, ...props })));
    const cached = JSON.stringify(c.getQueryCache().getAll().map((q) => q.state.data));
    c.clear();
    return { html, cached };
  };
  const configured = (extra = {}) => (c) => c.setQueryData(status, { configured: true, maxBytes: 8 * 1024 * 1024, maxPerOwner: 3, ...extra });
  const withList = (n) => (c) => { configured()(c); c.setQueryData(owned, Array.from({ length: n }, (_, i) => attachment(i + 1))); };

  let r = render((c) => c.setQueryData(status, { configured: false }));
  assert.match(r.html, /Photos aren’t set up on this server yet/); assert.doesNotMatch(r.html, /Add photo|<input|<img/);
  r = render(withList(0));
  assert.match(r.html, /Add photo/); assert.match(r.html, /accept="image\/\*"/); assert.match(r.html, /No photos yet/);
  assert.match(r.html, /capture="environment"/, 'the camera input is there for phones');
  assert.doesNotMatch(r.html, /Take photo<\/button>/, 'no camera button on a desktop pointer');
  globalThis.window.matchMedia = (q) => ({ matches: /coarse/.test(q) });
  r = render(withList(0));
  assert.match(r.html, /Take photo/, 'the camera button appears on touch devices');
  delete globalThis.window.matchMedia;
  r = render(withList(2));
  assert.match(r.html, /<img[^>]*alt="Photo 1 of 2"/); assert.match(r.html, /alt="Photo 2 of 2"/);
  assert.match(r.html, new RegExp(`src="/api/media/${'1'.padStart(24, 'd')}/file"`)); assert.match(r.html, /loading="lazy"/);
  assert.match(r.html, /width="88" height="88"|height="88"[^>]*width="88"/, 'fixed size so nothing jumps');
  assert.match(r.html, /aria-label="Open photo 1 of 2"/);
  assert.doesNotMatch(r.html, /You can attach up to/);
  assert.match(r.html, /<button type="button" class="btn btn--quiet btn--small"><svg[^>]*>.*?<\/svg> Add photo/s, 'room left: the add button is enabled');
  // Count limit: message shown, add buttons disabled.
  r = render(withList(3));
  assert.match(r.html.replace(/<!-- -->/g, ''), /You can attach up to 3 photos here\. Remove one to add another\./);
  assert.match(r.html, /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Add photo/s);
  // Read-only: photos visible, nothing to change.
  r = render(withList(2), { readOnly: true });
  assert.doesNotMatch(r.html, /Add photo|Take photo|<input/); assert.match(r.html, /alt="Photo 1 of 2"/);
  r = render(withList(0), { readOnly: true }); assert.match(r.html, /No photos\./);
  // Guest mode: receipts show amounts, so nothing is fetched or drawn.
  r = render(withList(2), { guestMode: true }, { view: true });
  assert.match(r.html, /Hidden in guest mode/); assert.doesNotMatch(r.html, /<img|Add photo|Take photo|alt="Photo/);
  // Not saved yet: nothing at all.
  r = render(withList(0), { ownerId: undefined }); assert.equal(r.html, '');
  // The panel never puts image bytes or blob URLs in a cache.
  r = render(withList(2)); assert.doesNotMatch(r.cached, /blob:|data:image|base64/);

  // ---- where it is mounted ----
  const src = async (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');
  assert.match(await src('features/media/AttachmentsPanel.jsx'), /const \{ guestMode \} = useGuestMode\(\);\s*return <AttachmentsPanelView \{\.\.\.props\} guestMode=\{guestMode\} \/>/, 'the panel follows guest mode');
  for (const [file, owner, id] of [
    ['features/ledger/TransactionSheet.jsx', 'transaction', 'tx._id'], ['features/ledger/TransactionNoteDialog.jsx', 'transaction', 'transaction._id'],
    ['features/tasks/TaskItem.jsx', 'task', 'task._id'], ['features/goals/GoalDetailPage.jsx', 'goal', 'goal._id'],
  ]) {
    const text = await src(file);
    assert.match(text, new RegExp(`<AttachmentsPanel ownerType="${owner}" ownerId=\\{${id.replace('.', '\\.')}\\}`), `${file} mounts the panel for ${owner}`);
  }
  console.log('Media UI: fitWithin, validation, JPEG re-encode, hook endpoints/headers/invalidation, no bytes in caches, panel markup (unconfigured, empty, thumbnails, limit, read-only, guest mode) and mounts passed.');
} finally {
  await server.close(); globalThis.fetch = originalFetch;
  globalThis.createImageBitmap = originalBitmap; globalThis.document = originalDocument;
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
}
