const test = require('node:test');
const assert = require('node:assert');
const { validateAppointment, countByStatus } = require('../src/validation');

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
