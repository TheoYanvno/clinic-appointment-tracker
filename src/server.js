// Small web server using only Node's built-in modules (no frameworks).
// API requests go to the shared router in routes.js; everything else is served from public/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClinicRepository } from './ClinicRepository.js';
import { openNodeDatabase } from './db/nodeDriver.js';
import { readSql } from './sqlFiles.js';
import { handle } from './routes.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const MAX_BODY = 8 * 1024 * 1024;           // uploads arrive as base64 JSON; files are limited to 5 MB
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.sql': 'text/plain' };

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(Object.assign(new Error('Request is too large'), { status: 413 })); req.destroy(); }
    });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); } });
  });
}

const COOKIE = 'gh_session';
const readCookie = (header = '') => header.split(';').map((c) => c.trim().split('=')).find(([k]) => k === COOKIE)?.[1] ?? null;

// HttpOnly: page scripts can't read the token. SameSite=Strict: other sites can't send it.
const sessionCookie = (token, maxAge) => `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}`;

export function createServer(repo) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const send = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };

    if (url.pathname.startsWith('/api/')) {
      try {
        const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers['content-length'] !== '0' ? await readJson(req) : {};
        const token = readCookie(req.headers.cookie);
        const result = handle(repo, { method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body, token });
        // The session token travels only in the cookie, never in the JSON the page can see
        if (url.pathname === '/api/login' && result.status === 200) {
          const { token: newToken, ...rest } = result.body;
          return send(200, rest, { 'Set-Cookie': sessionCookie(newToken, 8 * 3600) });
        }
        if (url.pathname === '/api/logout') return send(result.status, result.body, { 'Set-Cookie': sessionCookie('', 0) });
        return send(result.status, result.body);
      } catch (err) {
        return send(err.status ?? 500, { errors: [err.message] });
      }
    }

    // Static front end, plus the shared modules in src/ that the browser also imports
    // (path.join + startsWith check blocks ../ tricks)
    const shared = url.pathname.startsWith('/src/') && url.pathname.endsWith('.js');
    const base = shared ? ROOT : PUBLIC;
    const file = path.join(base, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
    if (!file.startsWith(shared ? path.join(ROOT, 'src') : PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(404, { errors: ['Not found'] });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repo = new ClinicRepository(openNodeDatabase(path.join(ROOT, 'clinic.db'))).init({ schema: readSql('schema.sql') });
  const port = process.env.PORT || 3000;
  createServer(repo).listen(port, () => console.log(`Gotham Hospital Patient Portal running at http://localhost:${port}`));
}
