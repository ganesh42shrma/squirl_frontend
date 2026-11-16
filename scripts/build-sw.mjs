import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const assets = (await readdir(new URL('dist/assets/', root))).filter((f) => /\.(js|css|woff2?|svg|png)$/.test(f)).map((f) => `/assets/${f}`);
const files = ['/offline.html', '/offline.css', '/icons/squirl-192.png', '/icons/squirl-512.png', '/icons/squirl-badge.png', ...assets].sort();
const template = await readFile(new URL('src/pwa/sw.template.js', root), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(await readFile(new URL(`dist${file}`, root)));
const digest = hash.digest('hex');
const name = `squirl-shell-${digest.slice(0, 16)}`;
// A readable label for Settings. The date is the commit's, never the clock, so rebuilding the same code gives the
// same worker and never shows a pointless "update available". Without git (a deploy copy) there is just no date.
const commitDate = () => {
  try { return execFileSync('git', ['log', '-1', '--format=%cI'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
};
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const build = { id: digest.slice(0, 7), at: commitDate(), v: pkg.version };
await writeFile(new URL('dist/sw.js', root), template.replace('__CACHE_NAME__', JSON.stringify(name)).replace('__PRECACHE_FILES__', JSON.stringify(files)).replace('__BUILD_INFO__', JSON.stringify(build)));
console.log(`Service worker built: ${files.length} public interface files; no API data.`);
