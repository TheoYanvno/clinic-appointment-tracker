// Data access layer: one class owns every SQL statement.
// It talks to a small driver (node:sqlite on the server, sql.js in the browser), never to an engine directly.

export class ClinicRepository {
  constructor(driver) {
    this.db = driver;
  }

  /** Creates tables from schema.sql; loads sample data only if the database is empty. */
  init({ schema, seed }) {
    this.db.exec(schema);
    const { n } = this.db.get('SELECT COUNT(*) AS n FROM providers');
    if (seed && n === 0) this.db.exec(seed);
    return this;
  }

  listByDate(date) {
    return this.db.all(`
      SELECT a.id, a.starts_at AS startsAt, a.reason, a.status,
             p.first_name || ' ' || p.last_name AS patient,
             pr.full_name AS provider
      FROM appointments a
      JOIN patients  p  ON p.id  = a.patient_id
      JOIN providers pr ON pr.id = a.provider_id
      WHERE date(a.starts_at) = ?
      ORDER BY a.starts_at`, [date]);
  }

  create({ patientId, providerId, startsAt, reason }) {
    // Parameterized query (?) prevents SQL injection
    return this.db.run(`
      INSERT INTO appointments (patient_id, provider_id, starts_at, reason)
      VALUES (?, ?, ?, ?)`, [patientId, providerId, startsAt, reason.trim()]).lastId;
  }

  updateStatus(id, status) {
    return this.db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id]).changes === 1;
  }

  providerWorkload() {
    return this.db.all(`
      SELECT pr.full_name AS provider,
             COUNT(a.id) AS total,
             SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN a.status = 'no_show'   THEN 1 ELSE 0 END) AS noShows
      FROM providers pr
      LEFT JOIN appointments a ON a.provider_id = pr.id
      GROUP BY pr.id
      ORDER BY total DESC`);
  }

  patients() {
    return this.db.all(`SELECT id, first_name || ' ' || last_name AS name FROM patients ORDER BY last_name`);
  }

  providers() {
    return this.db.all('SELECT id, full_name AS name, specialty FROM providers ORDER BY full_name');
  }
}
