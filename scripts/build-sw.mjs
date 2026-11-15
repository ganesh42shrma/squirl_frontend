import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const assets = (await readdir(new URL('dist/assets/', root))).filter((f) => /\.(js|css|woff2?|svg|png)$/.test(f)).map((f) => `/assets/${f}`);
const files = ['/offline.html', '/offline.css', '/icons/squirl-192.png', '/icons/squirl-512.png', ...assets].sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(new URL(`dist${file}`, root)));
const name = `squirl-shell-${hash.digest('hex').slice(0, 16)}`;
const template = await readFile(new URL('src/pwa/sw.template.js', root), 'utf8');
await writeFile(new URL('dist/sw.js', root), template.replace('__CACHE_NAME__', JSON.stringify(name)).replace('__PRECACHE_FILES__', JSON.stringify(files)));
console.log(`Service worker built: ${files.length} public interface files; no API data.`);
