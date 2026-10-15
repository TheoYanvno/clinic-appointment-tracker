import test from 'node:test';
import assert from 'node:assert';
import { validateAppointment, validatePatient, countByStatus } from '../src/validation.js';

test('valid appointment has no errors', () => {
  const errors = validateAppointment({ patientId: 1, providerId: 2, startsAt: '2026-10-20 09:00', reason: 'Follow-up' });
  assert.deepStrictEqual(errors, []);
});

test('bad date and missing reason are reported', () => {
  const errors = validateAppointment({ patientId: 1, providerId: 2, startsAt: '10/20/2026', reason: '' });
  assert.strictEqual(errors.length, 2);
});

test('countByStatus groups with reduce', () => {
  const counts = countByStatus([{ status: 'completed' }, { status: 'no_show' }, { status: 'completed' }]);
  assert.deepStrictEqual(counts, { completed: 2, no_show: 1 });
});

test('appointments start on the quarter hour with an allowed length and visit type', () => {
  const base = { patientId: 1, providerId: 2, startsAt: '2026-10-20 09:00', reason: 'Follow-up' };
  assert.strictEqual(validateAppointment({ ...base, startsAt: '2026-10-20 09:10' }).length, 1);
  assert.strictEqual(validateAppointment({ ...base, duration: 20 }).length, 1);
  assert.strictEqual(validateAppointment({ ...base, visitType: 'Checkup' }).length, 1);
  assert.deepStrictEqual(validateAppointment({ ...base, duration: 45, visitType: 'New patient' }), []);
});

test('patient form rules: required fields, birth date, contact formats and insurance member ID', () => {
  const good = { first_name: 'Rex', last_name: 'Mason', birth_date: '1979-03-05', sex: 'M', phone: '555-0177', email: 'rex@example.com', zip: '07102' };
  assert.deepStrictEqual(validatePatient(good, { today: '2026-10-15' }), []);
  assert.strictEqual(validatePatient({ ...good, birth_date: '2030-01-01' }, { today: '2026-10-15' }).length, 1);
  assert.strictEqual(validatePatient({ ...good, email: 'rex@', zip: '7102' }).length, 2);
  assert.strictEqual(validatePatient({ ...good, insurance: [{ coverage: 'primary', payer: 'Medicare' }] }).length, 1);
  assert.strictEqual(validatePatient({}).length, 4);
  assert.deepStrictEqual(validatePatient({ phone: '555-0199' }, { partial: true }), []);   // editing one field
});
