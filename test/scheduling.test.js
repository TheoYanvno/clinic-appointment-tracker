import test from 'node:test';
import assert from 'node:assert';
import { ENGINES } from './engines.js';
import { clinic, NOW, signIn } from './fixture.js';
import { handle } from '../src/routes.js';
import { weekOf, monthGrid, addDays, weekdayOf } from '../src/schedule.js';

test('calendar helpers: week is Monday–Friday, month grid is whole weeks', () => {
  assert.deepStrictEqual(weekOf('2026-10-15'), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);
  assert.deepStrictEqual(weekOf('2026-10-18'), weekOf('2026-10-15'));         // Sunday belongs to the week before
  const grid = monthGrid('2026-10-15');
  assert.strictEqual(grid.length % 7, 0);
  assert.strictEqual(weekdayOf(grid[0]), 0);
  assert.ok(grid.includes('2026-10-01') && grid.includes('2026-10-31'));
  assert.strictEqual(addDays('2026-11-01', -1), '2026-10-31');
});

for (const [engine, open] of ENGINES) {
  const repo = clinic(open);
  const thompkins = repo.providers({ q: 'Thompkins' })[0];      // works 08:00–16:30, lunch 12:00–13:00

  test(`${engine}: open slots respect provider hours, lunch and existing visits`, () => {
    const slots = repo.openSlots({ providerId: thompkins.id, date: '2026-10-22', duration: 30 });
    assert.ok(slots.length > 0);
    assert.ok(slots.every((t) => t >= '08:00' && t <= '16:00'));
    assert.ok(!slots.some((t) => t >= '11:45' && t < '13:00'), 'nothing that runs into lunch');
    const busy = repo.appointments({ from: '2026-10-22', providerId: thompkins.id }).filter((a) => a.status !== 'cancelled');
    for (const a of busy) assert.ok(!slots.includes(a.startsAt.slice(11)), `${a.startsAt} is taken`);
    assert.deepStrictEqual(repo.openSlots({ providerId: thompkins.id, date: '2026-10-24' }), []);   // Saturday
  });

  test(`${engine}: booking problems are explained in plain words`, () => {
    const p = { patientId: 1, providerId: thompkins.id, duration: 30 };
    assert.match(repo.bookingProblems({ ...p, startsAt: '2026-10-24 10:00' })[0], /closed on weekends/);
    assert.match(repo.bookingProblems({ ...p, startsAt: '2026-10-22 07:30' }).join(' '), /business hours/);
    assert.match(repo.bookingProblems({ ...p, startsAt: '2026-10-22 16:30' }).join(' '), /provider's hours/);
    assert.match(repo.bookingProblems({ ...p, startsAt: '2026-10-22 11:45' }).join(' '), /lunch/);
    assert.match(repo.bookingProblems({ ...p, startsAt: '2026-10-14 09:00' }, NOW).join(' '), /already passed/);
    const taken = repo.appointments({ from: '2026-10-22', providerId: thompkins.id }).find((a) => a.status === 'scheduled');
    assert.match(repo.bookingProblems({ ...p, patientId: null, startsAt: taken.startsAt }).join(' '), /already has a visit/);
    const [free] = repo.openSlots({ providerId: thompkins.id, date: '2026-10-22' });
    assert.deepStrictEqual(repo.bookingProblems({ ...p, patientId: null, startsAt: `2026-10-22 ${free}` }, NOW), []);
  });

  test(`${engine}: API books an open slot (201) and refuses a clash (409) or bad input (400)`, () => {
    const db = clinic(open);
    const token = signIn(db, 'customerservice');                       // booking is customer service's job
    const api = (method, path, body, query) => handle(db, { method, path, body, query, token, today: '2026-10-15', now: NOW });
    const [free] = api('GET', `/api/providers/${thompkins.id}/slots`, undefined, { date: '2026-10-23', duration: '30' }).body;
    const visit = { patientId: 5, providerId: thompkins.id, startsAt: `2026-10-23 ${free}`, duration: 30, visitType: 'Sick visit', reason: 'Sore throat' };
    const created = api('POST', '/api/appointments', visit);
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.patient, 'James Gordon');
    const clash = api('POST', '/api/appointments', { ...visit, patientId: 6 });
    assert.strictEqual(clash.status, 409);
    assert.match(clash.body.errors.join(' '), /already has a visit/);
    assert.strictEqual(api('POST', '/api/appointments', { ...visit, startsAt: '2026-10-23 9am' }).status, 400);
    // cancel, then the slot is open again; un-cancelling is refused once someone else takes it
    assert.strictEqual(api('PATCH', `/api/appointments/${created.body.id}/status`, { status: 'cancelled' }).status, 200);
    assert.strictEqual(api('POST', '/api/appointments', { ...visit, patientId: 6 }).status, 201);
    assert.strictEqual(api('PATCH', `/api/appointments/${created.body.id}/status`, { status: 'scheduled' }).status, 409);
  });

  test(`${engine}: API validates new patients`, () => {
    const db = clinic(open);
    const token = signIn(db, 'medicalstaff');                          // patient charts are medical staff only
    const api = (method, path, body) => handle(db, { method, path, body, token, today: '2026-10-15', now: NOW });
    assert.strictEqual(api('POST', '/api/patients', { first_name: 'Rex' }).status, 400);
    const created = api('POST', '/api/patients', { first_name: 'Rex', last_name: 'Mason', birth_date: '1979-03-05', sex: 'M' });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(api('PUT', `/api/patients/${created.body.id}`, { email: 'not-an-email' }).status, 400);
    assert.strictEqual(api('GET', '/api/patients/999999').status, 404);
  });
}

for (const [engine, open] of ENGINES) {
  test(`${engine}: patient photo can be saved, replaced and removed`, () => {
    const db = clinic(open);
    const token = signIn(db, 'medicalstaff');                          // patient charts are medical staff only
    const api = (method, path, body) => handle(db, { method, path, body, token, today: '2026-10-15', now: NOW });
    const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
    assert.strictEqual(api('PUT', '/api/patients/1/photo', { photo }).status, 200);
    assert.strictEqual(api('GET', '/api/patients/1').body.photo, photo);
    assert.strictEqual(handle(db, { path: '/api/patients', query: { q: 'Bruce Wayne' }, token, now: NOW }).body[0].hasPhoto, 1);
    assert.strictEqual(api('PUT', '/api/patients/1/photo', { photo: 'data:text/html;base64,PHNjcmlwdD4=' }).status, 400);
    assert.strictEqual(api('PUT', '/api/patients/1/photo', { photo: `data:image/png;base64,${'A'.repeat(500_000)}` }).status, 400);
    assert.strictEqual(api('PUT', '/api/patients/1/photo', { photo: null }).status, 200);
    assert.strictEqual(api('GET', '/api/patients/1').body.photo, null);
    assert.strictEqual(api('PUT', '/api/patients/999999/photo', { photo }).status, 404);
  });
}

for (const [engine, open] of ENGINES) {
  test(`${engine}: documents upload as base64, are stored as BLOBs, download intact and can be deleted`, () => {
    const db = clinic(open);
    const token = signIn(db, 'medicalstaff');                          // patient charts are medical staff only
    const api = (method, path, body) => handle(db, { method, path, body, token, today: '2026-10-15', now: NOW });
    assert.ok(api('GET', '/api/patients/1').body.documents.some((d) => d.title === 'Chest X-ray report'));   // seeded sample
    const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);                                // binary, not text
    const upload = { title: 'MRI knee', category: 'Imaging', fileName: 'mri.pdf', mimeType: 'application/pdf', dataBase64: Buffer.from(bytes).toString('base64') };
    const created = api('POST', '/api/patients/2/documents', upload);
    assert.strictEqual(created.status, 201);
    assert.strictEqual(created.body.size, 70000);
    const fetched = api('GET', `/api/documents/${created.body.id}`).body;
    assert.deepStrictEqual(new Uint8Array(Buffer.from(fetched.dataBase64, 'base64')), bytes);
    assert.strictEqual(api('POST', '/api/patients/2/documents', { ...upload, mimeType: 'application/x-msdownload' }).status, 400);
    assert.strictEqual(api('POST', '/api/patients/2/documents', { ...upload, category: 'Selfie' }).status, 400);
    assert.strictEqual(api('POST', '/api/patients/2/documents', { ...upload, dataBase64: 'A'.repeat(7_200_000) }).status, 400);
    assert.strictEqual(api('POST', '/api/patients/999999/documents', upload).status, 404);
    assert.strictEqual(api('DELETE', `/api/documents/${created.body.id}`).status, 200);             // medical staff may delete
    assert.strictEqual(api('GET', `/api/documents/${created.body.id}`).status, 404);
  });
}
