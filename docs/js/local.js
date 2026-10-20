// Live demo backend: runs the same router (src/routes.js), repository and SQL as the Node server,
// but inside the browser using sql.js (SQLite compiled to WebAssembly).
// The database is saved in IndexedDB after every change, so it survives a page refresh on this device.
import { ClinicRepository } from '../src/ClinicRepository.js';
import { wrapSqlJsDatabase } from '../src/db/sqljsDriver.js';
import { handle } from '../src/routes.js';
import { toDateString, weekOf } from '../src/schedule.js';

const STORE = 'gotham-portal';
const KEY = 'database-v1';
let ready;

// ---- Tiny IndexedDB key-value store (wrapped in try/catch: private windows may block it)
function idb(mode, work) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(STORE, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', mode);
      const req = work(tx.objectStore('kv'));
      tx.oncomplete = () => { resolve(req?.result); open.result.close(); };
      tx.onerror = () => reject(tx.error);
    };
  });
}
const load = () => idb('readonly', (s) => s.get(KEY)).catch(() => undefined);
const save = (value) => idb('readwrite', (s) => s.put(value, KEY)).catch(() => {});
const clear = () => idb('readwrite', (s) => s.delete(KEY)).catch(() => {});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src, onload: resolve, onerror: () => reject(new Error(`Could not load ${src}`)) });
    document.head.append(s);
  });
}

async function start() {
  const status = (text) => { const el = document.getElementById('loading'); if (el) el.textContent = text; };
  status('Starting the database engine…');
  await loadScript('vendor/sql-wasm.js');
  const SQL = await window.initSqlJs({ locateFile: (file) => `vendor/${file}` });
  const schema = await (await fetch('sql/schema.sql')).text();

  // Reuse this browser's saved clinic if it was created this week; otherwise build a fresh one
  // so the schedule is always centered on the current week.
  const saved = await load();
  const thisWeek = weekOf(toDateString(new Date()))[0];
  let db;
  if (saved?.week === thisWeek) {
    db = wrapSqlJsDatabase(new SQL.Database(saved.bytes));
  } else {
    status('Opening Gotham Hospital: creating 36 providers, 2,400 patients and six weeks of appointments…');
    await new Promise((r) => setTimeout(r, 30));          // let the message paint before the busy work
    db = wrapSqlJsDatabase(new SQL.Database());
  }
  const repo = new ClinicRepository(db).init({ schema });
  if (saved?.week !== thisWeek) await save({ week: thisWeek, bytes: db.export() });

  let timer;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => save({ week: thisWeek, bytes: db.export() }), 250); };
  return { repo, persist };
}

// The demo has no server to set a cookie, so the staff session token is kept in this browser's storage.
const TOKEN_KEY = 'gotham-staff-session';
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const writeToken = (token) => { try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch {} };

/** Same contract as the HTTP API: resolves to { status, body }. */
export async function request(method, path, body) {
  ready ??= start();
  const { repo, persist } = await ready;
  const url = new URL(path, location.origin);
  const result = handle(repo, { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: body ?? {}, token: readToken() });
  if (url.pathname === '/api/login' && result.status === 200) {
    writeToken(result.body.token);
    const { token, ...rest } = result.body;           // hide it from the page, like the server does
    result.body = rest;
  }
  if (url.pathname === '/api/logout') writeToken(null);
  if (method !== 'GET' && result.status < 400) persist();
  return { status: result.status, body: JSON.parse(JSON.stringify(result.body)) };   // same shape a real response would have
}

/** Deletes this browser's saved copy and reloads with fresh sample data. */
export async function resetDemo() {
  await clear();
  location.reload();
}
