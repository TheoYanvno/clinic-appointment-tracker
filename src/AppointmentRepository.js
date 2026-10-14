// Data access layer: one class owns every SQL statement.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

class AppointmentRepository {
  constructor(file = ':memory:') {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  /** Creates tables; loads sample data only if the database is empty. */
  init({ seed = true } = {}) {
    const sql = (name) => fs.readFileSync(path.join(__dirname, '..', 'sql', name), 'utf8');
    this.db.exec(sql('schema.sql'));
    const { n } = this.db.prepare('SELECT COUNT(*) AS n FROM providers').get();
    if (seed && n === 0) this.db.exec(sql('seed.sql'));
    return this;
  }

  listByDate(date) {
    return this.db.prepare(`
      SELECT a.id, a.starts_at AS startsAt, a.reason, a.status,
             p.first_name || ' ' || p.last_name AS patient,
             pr.full_name AS provider
      FROM appointments a
      JOIN patients  p  ON p.id  = a.patient_id
      JOIN providers pr ON pr.id = a.provider_id
      WHERE date(a.starts_at) = ?
      ORDER BY a.starts_at`).all(date);
  }

  create({ patientId, providerId, startsAt, reason }) {
    // Parameterized query (?) prevents SQL injection
    const result = this.db.prepare(`
      INSERT INTO appointments (patient_id, provider_id, starts_at, reason)
      VALUES (?, ?, ?, ?)`).run(patientId, providerId, startsAt, reason.trim());
    return Number(result.lastInsertRowid);
  }

  updateStatus(id, status) {
    const result = this.db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    return result.changes === 1;
  }

  providerWorkload() {
    return this.db.prepare(`
      SELECT pr.full_name AS provider,
             COUNT(a.id) AS total,
             SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
             SUM(CASE WHEN a.status = 'no_show'   THEN 1 ELSE 0 END) AS noShows
      FROM providers pr
      LEFT JOIN appointments a ON a.provider_id = pr.id
      GROUP BY pr.id
      ORDER BY total DESC`).all();
  }

  patients() {
    return this.db.prepare(`SELECT id, first_name || ' ' || last_name AS name FROM patients ORDER BY last_name`).all();
  }

  providers() {
    return this.db.prepare('SELECT id, full_name AS name, specialty FROM providers ORDER BY full_name').all();
  }
}

module.exports = { AppointmentRepository };
