import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is proxied to the Express backend so the browser sees one origin (no CORS).
// Where the backend lives, in order: VITE_API_PROXY (shell or .env.local, an explicit override),
// then the PORT in ../squirl_backend/.env, then the backend's own default, 4000. So the proxy
// follows the backend's port without anyone keeping two files in step.
function backendTarget(env) {
  const explicit = process.env.VITE_API_PROXY || env.VITE_API_PROXY;
  if (explicit) return explicit;
  let port = 4000;
  const file = resolve(process.cwd(), '../squirl_backend/.env');
  if (existsSync(file)) {
    const match = readFileSync(file, 'utf8').match(/^\s*PORT\s*=\s*(\d+)/m);
    if (match) port = Number(match[1]);
  }
  return `http://localhost:${port}`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': backendTarget(env) },
    },
  };
});
