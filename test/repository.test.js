import test from 'node:test';
import assert from 'node:assert';
import { ClinicRepository } from '../src/ClinicRepository.js';
import { readSql } from '../src/sqlFiles.js';
import { ENGINES } from './engines.js';

for (const [engine, open] of ENGINES) {
  const fresh = () => new ClinicRepository(open()).init({ schema: readSql('schema.sql'), seed: readSql('seed.sql') });

  test(`${engine}: daily schedule joins patient and provider names`, () => {
    const day = fresh().listByDate('2026-10-19');
    assert.strictEqual(day.length, 4);
    assert.strictEqual(day[0].patient, 'Jordan Lee');
    assert.strictEqual(day[0].provider, 'Dr. Maya Chen');
  });

  test(`${engine}: provider cannot be double-booked (UNIQUE constraint)`, () => {
    assert.throws(() => fresh().create({ patientId: 2, providerId: 1, startsAt: '2026-10-19 08:00', reason: 'Checkup' }));
  });

  test(`${engine}: unknown patient is rejected (foreign key)`, () => {
    assert.throws(() => fresh().create({ patientId: 999, providerId: 1, startsAt: '2026-10-22 08:00', reason: 'Checkup' }));
  });

  test(`${engine}: workload report counts completed visits and no-shows`, () => {
    const chen = fresh().providerWorkload().find((r) => r.provider === 'Dr. Maya Chen');
    assert.deepStrictEqual({ ...chen }, { provider: 'Dr. Maya Chen', total: 3, completed: 2, noShows: 0 });
  });

  test(`${engine}: status update changes one row`, () => {
    const repo = fresh();
    assert.strictEqual(repo.updateStatus(5, 'checked_in'), true);
    assert.strictEqual(repo.updateStatus(999, 'checked_in'), false);
  });
}
