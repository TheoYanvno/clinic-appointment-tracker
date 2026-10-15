import test from 'node:test';
import assert from 'node:assert';
import { ENGINES } from './engines.js';
import { clinic, TODAY } from './fixture.js';

for (const [engine, open] of ENGINES) {
  const repo = clinic(open);                  // read-only checks share one database

  test(`${engine}: 36 providers across four credentials, working Monday–Friday only`, () => {
    const providers = repo.providers();
    assert.strictEqual(providers.length, 36);
    const count = (c) => providers.filter((p) => p.credential === c).length;
    assert.deepStrictEqual([count('MD'), count('DO'), count('NP'), count('PA')], [16, 4, 9, 7]);
    assert.ok(providers.every((p) => p.hours.length >= 4 && p.hours.every((h) => h.weekday >= 1 && h.weekday <= 5)));
    assert.strictEqual(repo.providers({ credential: 'PA' }).length, 7);
    assert.strictEqual(repo.providers({ q: 'Pediatrics' }).length, 3);
  });

  test(`${engine}: clinic is open Monday–Friday 8:00–17:00 and closed on weekends`, () => {
    const hours = repo.clinicHours();
    assert.deepStrictEqual(hours.filter((h) => h.opens).map((h) => h.weekday), [1, 2, 3, 4, 5]);
    assert.ok(hours.filter((h) => h.opens).every((h) => h.opens === '08:00' && h.closes === '17:00'));
  });

  test(`${engine}: DC character patients have insurance and themed visits`, () => {
    const [bruce] = repo.searchPatients('Bruce Wayne');
    const profile = repo.patient(bruce.id);
    assert.strictEqual(profile.mrn, 'GH-104200');
    assert.strictEqual(profile.insurance[0].payer, 'Wayne Enterprises Employee Health');
    assert.strictEqual(profile.primary_provider, 'Leslie Thompkins, MD');
    assert.ok(profile.appointments.some((a) => a.reason === 'Bruised ribs follow-up' && a.startsAt === `${TODAY} 10:00`));
  });

  test(`${engine}: search by last name, "Last, First", MRN or birth date`, () => {
    assert.ok(repo.searchPatients('Gordon').length >= 2);
    assert.strictEqual(repo.searchPatients('Kyle, Sel')[0].name, 'Selina Kyle');
    assert.strictEqual(repo.searchPatients('GH-104200')[0].name, 'Bruce Wayne');
    assert.strictEqual(repo.searchPatients('1985-02-19')[0].name, 'Bruce Wayne');
  });

  test(`${engine}: no appointments on weekends or outside provider hours`, () => {
    const { n } = repo.db.get(`SELECT COUNT(*) AS n FROM appointments a
      LEFT JOIN provider_hours h ON h.provider_id = a.provider_id AND h.weekday = CAST(strftime('%w', a.starts_at) AS INTEGER)
      WHERE h.provider_id IS NULL OR time(a.starts_at) < h.starts
         OR strftime('%H:%M', a.starts_at, '+' || a.duration_min || ' minutes') > h.ends`);
    assert.strictEqual(n, 0);
  });

  test(`${engine}: past visits are completed, no-show or cancelled; future ones are scheduled or cancelled`, () => {
    const past = repo.db.all("SELECT DISTINCT status FROM appointments WHERE starts_at < '2026-10-15 08:00'").map((r) => r.status).sort();
    const future = repo.db.all("SELECT DISTINCT status FROM appointments WHERE starts_at > '2026-10-16'").map((r) => r.status).sort();
    assert.deepStrictEqual(past, ['cancelled', 'completed', 'no_show']);
    assert.deepStrictEqual(future, ['cancelled', 'scheduled']);
  });

  test(`${engine}: month counts and workload report`, () => {
    const counts = repo.dailyCounts({ from: '2026-10-01', to: '2026-10-31' });
    assert.ok(counts.length >= 15 && counts.every((d) => d.total > 0));
    const workload = repo.providerWorkload();
    assert.strictEqual(workload.length, 36);
    assert.ok(workload.every((w) => w.total >= w.completed + w.noShows));
  });

  test(`${engine}: create and update a patient with primary and secondary insurance`, () => {
    const db = clinic(open);
    const id = db.createPatient({
      first_name: 'Rex', last_name: 'Mason', birth_date: '1979-03-05', sex: 'M', phone: '555-0177', primary_provider_id: 4,
      insurance: [{ coverage: 'primary', payer: 'Gotham Mutual Health', member_id: 'GOT123' }, { coverage: 'secondary', payer: 'Medicaid', member_id: 'MCD9' }],
    });
    let p = db.patient(id);
    assert.match(p.mrn, /^GH-\d{6}$/);
    assert.deepStrictEqual(p.insurance.map((i) => i.coverage), ['primary', 'secondary']);
    db.updatePatient(id, { phone: '555-0178', insurance: [{ coverage: 'secondary', payer: '' }] });
    p = db.patient(id);
    assert.strictEqual(p.phone, '555-0178');
    assert.strictEqual(p.insurance.length, 1);
  });

  test(`${engine}: a provider can't be double-booked, and unknown patients are rejected`, () => {
    const db = clinic(open);
    const taken = db.appointments({ from: '2026-10-19' }).find((a) => a.status === 'scheduled');
    assert.throws(() => db.createAppointment({ patientId: 1, providerId: taken.providerId, startsAt: taken.startsAt, reason: 'Checkup' }));
    assert.throws(() => db.createAppointment({ patientId: 99999, providerId: 1, startsAt: '2026-10-22 07:00', reason: 'Checkup' }));
  });
}
