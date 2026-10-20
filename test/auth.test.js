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
  test(`${engine}: staff sign in, see reports, delete documents, and sign out`, () => {
    const repo = clinic(open);
    const api = (method, path, { body, token, now = NOW } = {}) => handle(repo, { method, path, body, token, now, today: NOW.slice(0, 10) });

    // Signed out: the portal works, but reports and deleting are staff-only
    assert.strictEqual(api('GET', '/api/patients').status, 200);
    assert.strictEqual(api('GET', '/api/reports/workload').status, 401);
    assert.strictEqual(api('GET', '/api/me').body.staff, null);

    assert.strictEqual(api('POST', '/api/login', { body: { username: 'alfred', password: 'wrong' } }).status, 401);
    assert.strictEqual(api('POST', '/api/login', { body: { username: 'nobody', password: 'gotham-demo' } }).status, 401);
    assert.strictEqual(api('POST', '/api/login', { body: {} }).status, 400);

    const login = api('POST', '/api/login', { body: { username: 'Alfred', password: 'gotham-demo' } });   // usernames ignore case
    assert.strictEqual(login.status, 200);
    const { token } = login.body;
    assert.match(token, /^[0-9a-f]{64}$/);
    assert.deepStrictEqual(api('GET', '/api/me', { token }).body.staff, { id: 1, username: 'alfred', name: 'Alfred Pennyworth', role: 'Clinic manager' });
    assert.strictEqual(api('GET', '/api/reports/workload', { token }).status, 200);

    const [bruce] = repo.searchPatients('Bruce Wayne');
    const doc = api('POST', `/api/patients/${bruce.id}/documents`, {
      body: { title: 'Test note', category: 'Other', fileName: 'note.txt', mimeType: 'text/plain', dataBase64: 'aGk=' },
    });
    assert.strictEqual(doc.status, 201, JSON.stringify(doc.body));
    assert.strictEqual(api('DELETE', `/api/documents/${doc.body.id}`).status, 401);
    assert.strictEqual(api('DELETE', `/api/documents/${doc.body.id}`, { token }).status, 200);

    // Sessions expire after 8 hours
    assert.ok(api('GET', '/api/me', { token, now: '2026-10-15 17:49' }).body.staff);
    assert.strictEqual(api('GET', '/api/me', { token, now: '2026-10-15 17:50' }).body.staff, null);

    assert.strictEqual(api('POST', '/api/logout', { token }).status, 200);
    assert.strictEqual(api('GET', '/api/me', { token }).body.staff, null);
    assert.strictEqual(api('GET', '/api/reports/workload', { token }).status, 401);
  });

  test(`${engine}: only hashes are stored, never passwords`, () => {
    const repo = clinic(open);
    const rows = repo.db.all('SELECT * FROM staff');
    assert.strictEqual(rows.length, 2);
    assert.ok(rows.every((r) => !JSON.stringify(r).includes('gotham-demo') && /^[0-9a-f]{64}$/.test(r.password_hash)));
  });
}
