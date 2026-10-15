import test from 'node:test';
import assert from 'node:assert';
import { ENGINES } from './engines.js';
import { clinic, NOW } from './fixture.js';
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
    const api = (method, path, body, query) => handle(db, { method, path, body, query, today: '2026-10-15', now: NOW });
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
    const api = (method, path, body) => handle(db, { method, path, body, today: '2026-10-15', now: NOW });
    assert.strictEqual(api('POST', '/api/patients', { first_name: 'Rex' }).status, 400);
    const created = api('POST', '/api/patients', { first_name: 'Rex', last_name: 'Mason', birth_date: '1979-03-05', sex: 'M' });
    assert.strictEqual(created.status, 201);
    assert.strictEqual(api('PUT', `/api/patients/${created.body.id}`, { email: 'not-an-email' }).status, 400);
    assert.strictEqual(api('GET', '/api/patients/999999').status, 404);
  });
}
