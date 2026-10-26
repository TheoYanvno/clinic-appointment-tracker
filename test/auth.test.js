import test from 'node:test';
import assert from 'node:assert';
import { createHash, pbkdf2Sync } from 'node:crypto';
import { ENGINES } from './engines.js';
import { clinic, NOW } from './fixture.js';
import { handle } from '../src/routes.js';
import { sha256, pbkdf2, toHex, hashPassword, checkPassword } from '../src/auth.js';

test('SHA-256 and PBKDF2 match Node’s crypto module', () => {
  for (const text of ['', 'abc', 'a'.repeat(55), 'b'.repeat(64), 'c'.repeat(200)]) {
    assert.strictEqual(toHex(sha256(new TextEncoder().encode(text))), createHash('sha256').update(text).digest('hex'));
  }
  const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.strictEqual(toHex(pbkdf2('gotham', salt, 1000)), pbkdf2Sync('gotham', salt, 1000, 32, 'sha256').toString('hex'));
});

test('a stored hash accepts the right password only, and salts differ', () => {
  const a = hashPassword('correct horse', { iterations: 500 });
  const b = hashPassword('correct horse', { iterations: 500 });
  assert.notStrictEqual(a.salt, b.salt);
  assert.notStrictEqual(a.hash, b.hash);
  assert.ok(checkPassword('correct horse', a));
  assert.ok(!checkPassword('correct horse ', a));
});

for (const [engine, open] of ENGINES) {
  test(`${engine}: nothing opens without signing in, and the password picks the role`, () => {
    const repo = clinic(open);
    const api = (method, path, { body, token, now = NOW } = {}) => handle(repo, { method, path, body, token, now, today: NOW.slice(0, 10) });
    const login = (password, username = 'Gotham Staff') => api('POST', '/api/login', { body: { username, password } });

    // Signed out: only sign-in works
    for (const path of ['/api/patients', '/api/appointments', '/api/providers', '/api/clinic', '/api/reports/workload']) {
      assert.strictEqual(api('GET', path).status, 401, path);
    }
    assert.strictEqual(api('GET', '/api/me').body.staff, null);

    assert.strictEqual(login('wrong').status, 401);
    assert.strictEqual(login('customerservice', 'nobody').status, 401);
    assert.strictEqual(api('POST', '/api/login', { body: {} }).status, 400);

    const cs = login('customerservice', 'gotham staff');                 // usernames ignore case
    assert.strictEqual(cs.status, 200);
    assert.match(cs.body.token, /^[0-9a-f]{64}$/);
    assert.deepStrictEqual(api('GET', '/api/me', { token: cs.body.token }).body.staff,
      { id: 1, username: 'Gotham Staff', name: 'Customer Service', role: 'customer_service' });
    assert.strictEqual(login('medicalstaff').body.staff.role, 'medical_staff');
  });

  test(`${engine}: each role sees only its part of the portal`, () => {
    const repo = clinic(open);
    const api = (method, path, { body, token } = {}) => handle(repo, { method, path, body, token, now: NOW, today: NOW.slice(0, 10) });
    const tokenFor = (password) => api('POST', '/api/login', { body: { username: 'Gotham Staff', password } }).body.token;
    const [cs, med] = ['customerservice', 'medicalstaff'].map(tokenFor);
    const [bruce] = repo.searchPatients('Bruce Wayne');

    // Customer service: schedule, booking and reports; patient names for booking but not their charts
    for (const path of ['/api/appointments', '/api/providers', '/api/patients?q=wayne', '/api/reports/workload']) {
      assert.strictEqual(api('GET', path.split('?')[0], { token: cs }).status, 200, path);
    }
    assert.strictEqual(api('GET', `/api/patients/${bruce.id}`, { token: cs }).status, 403);
    assert.strictEqual(api('GET', `/api/patients/${bruce.id}/documents`, { token: cs }).status, 403);

    // Medical staff: charts and documents, schedule to read, but no booking or reports
    assert.strictEqual(api('GET', `/api/patients/${bruce.id}`, { token: med }).status, 200);
    assert.strictEqual(api('GET', '/api/appointments', { token: med }).status, 200);
    assert.strictEqual(api('POST', '/api/appointments', { token: med, body: {} }).status, 403);
    assert.strictEqual(api('GET', '/api/reports/workload', { token: med }).status, 403);
    const doc = api('POST', `/api/patients/${bruce.id}/documents`, { token: med,
      body: { title: 'Test note', category: 'Other', fileName: 'note.txt', mimeType: 'text/plain', dataBase64: 'aGk=' } });
    assert.strictEqual(doc.status, 201, JSON.stringify(doc.body));
    assert.strictEqual(api('DELETE', `/api/documents/${doc.body.id}`, { token: cs }).status, 403);
    assert.strictEqual(api('DELETE', `/api/documents/${doc.body.id}`, { token: med }).status, 200);

  });

  test(`${engine}: sessions expire after 8 hours and end at sign-out`, () => {
    const repo = clinic(open);
    const api = (method, path, { body, token, now = NOW } = {}) => handle(repo, { method, path, body, token, now, today: NOW.slice(0, 10) });
    const { token } = api('POST', '/api/login', { body: { username: 'Gotham Staff', password: 'customerservice' } }).body;
    assert.ok(api('GET', '/api/me', { token, now: '2026-10-15 17:49' }).body.staff);
    assert.strictEqual(api('GET', '/api/me', { token, now: '2026-10-15 17:50' }).body.staff, null);
    assert.strictEqual(api('POST', '/api/logout', { token }).status, 200);
    assert.strictEqual(api('GET', '/api/me', { token }).body.staff, null);
    assert.strictEqual(api('GET', '/api/appointments', { token }).status, 401);
  });

  test(`${engine}: only hashes are stored, never passwords`, () => {
    const repo = clinic(open);
    const rows = repo.db.all('SELECT * FROM staff');
    assert.strictEqual(rows.length, 2);
    for (const r of rows) {
      assert.ok(!/customerservice|medicalstaff/.test(JSON.stringify(r)));
      assert.match(r.password_hash, /^[0-9a-f]{64}$/);
    }
  });

  test(`${engine}: a database saved before roles gets the new staff table`, () => {
    const db = open();
    db.exec(`CREATE TABLE staff (id INTEGER PRIMARY KEY, username TEXT UNIQUE, display_name TEXT,
      role TEXT CHECK (role IN ('Clinic manager', 'Front desk')), password_salt TEXT, password_hash TEXT, iterations INTEGER);
      CREATE TABLE sessions (token TEXT PRIMARY KEY, staff_id INTEGER, created_at TEXT, expires_at TEXT);
      INSERT INTO staff VALUES (1, 'alfred', 'Alfred', 'Clinic manager', 'aa', 'bb', 1);`);
    const repo = clinic(() => db);
    assert.deepStrictEqual(repo.db.all('SELECT role FROM staff ORDER BY id').map((r) => r.role), ['customer_service', 'medical_staff']);
  });
}
