// Data access layer: one class owns every SQL statement.
// It talks to a small driver (node:sqlite on the server, sql.js in the browser), never to an engine directly.
// All queries are parameterized (?) so user input is never pasted into SQL.
import { seedDatabase } from './seed/generate.js';
import { weekdayOf, toMinutes, toTime } from './schedule.js';

const PATIENT_FIELDS = ['first_name', 'last_name', 'preferred_name', 'birth_date', 'sex', 'phone', 'email', 'address', 'city',
  'state', 'zip', 'preferred_language', 'emergency_name', 'emergency_relation', 'emergency_phone', 'primary_provider_id',
  'allergies', 'medications', 'notes'];
const INSURANCE_FIELDS = ['payer', 'plan_name', 'member_id', 'group_number', 'subscriber_name', 'subscriber_relation', 'copay'];

const APPOINTMENT_SELECT = `
  SELECT a.id, a.starts_at AS startsAt, a.duration_min AS duration, a.visit_type AS visitType, a.reason, a.status,
         a.patient_id AS patientId, p.first_name || ' ' || p.last_name AS patient, p.mrn,
         a.provider_id AS providerId, pr.first_name || ' ' || pr.last_name || ', ' || pr.credential AS provider,
         pr.specialty
  FROM appointments a
  JOIN patients  p  ON p.id  = a.patient_id
  JOIN providers pr ON pr.id = a.provider_id`;

export class ClinicRepository {
  constructor(driver) {
    this.db = driver;
  }

  /** Creates the tables; fills in sample data only if the database is empty. */
  init({ schema, seed = true, ...seedOptions }) {
    this.db.exec(schema);
    const { n } = this.db.get('SELECT COUNT(*) AS n FROM providers');
    if (seed && n === 0) seedDatabase(this.db, seedOptions);     // { today, now, generatedPatients }
    return this;
  }

  /** Runs several statements as one unit: all succeed or none do. */
  transaction(work) {
    this.db.exec('BEGIN');
    try {
      const result = work();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  // ---------- Clinic and providers ----------

  clinicHours() {
    return this.db.all('SELECT weekday, opens, closes FROM clinic_hours ORDER BY weekday');
  }

  providers({ credential, q } = {}) {
    const rows = this.db.all(`
      SELECT id, first_name AS firstName, last_name AS lastName, credential, specialty, room,
             CASE WHEN credential IN ('MD', 'DO') THEN 'Dr. ' ELSE '' END || first_name || ' ' || last_name AS name,
             accepting_new AS acceptingNew
      FROM providers
      WHERE (? IS NULL OR credential = ?)
        AND (? IS NULL OR first_name || ' ' || last_name || ' ' || specialty LIKE '%' || ? || '%')
      ORDER BY last_name, first_name`, [credential ?? null, credential ?? null, q ?? null, q ?? null]);
    const hours = this.db.all('SELECT provider_id AS providerId, weekday, starts, ends, lunch_starts AS lunchStarts, lunch_ends AS lunchEnds FROM provider_hours ORDER BY weekday');
    return rows.map((p) => ({ ...p, hours: hours.filter((h) => h.providerId === p.id) }));
  }

  provider(id) {
    return this.providers().find((p) => p.id === Number(id));
  }

  hoursFor(providerId, weekday) {
    return this.db.get(`SELECT starts, ends, lunch_starts AS lunchStarts, lunch_ends AS lunchEnds
                        FROM provider_hours WHERE provider_id = ? AND weekday = ?`, [providerId, weekday]);
  }

  // ---------- Patients ----------

  /** Search by name, MRN or birth date (YYYY-MM-DD). */
  searchPatients(q = '', limit = 50) {
    const text = q.trim();
    return this.db.all(`
      SELECT p.id, p.mrn, p.first_name AS firstName, p.last_name AS lastName,
             p.first_name || ' ' || p.last_name AS name, p.birth_date AS birthDate, p.sex, p.phone,
             p.photo IS NOT NULL AS hasPhoto, i.payer
      FROM patients p
      LEFT JOIN insurance i ON i.patient_id = p.id AND i.coverage = 'primary'
      WHERE ? = ''
         OR p.first_name || ' ' || p.last_name LIKE '%' || ? || '%'
         OR p.last_name || ', ' || p.first_name LIKE ? || '%'
         OR p.mrn LIKE '%' || ? || '%'
         OR p.birth_date = ?
      ORDER BY p.last_name, p.first_name
      LIMIT ?`, [text, text, text, text, text, limit]);
  }

  patient(id) {
    const patient = this.db.get(`
      SELECT p.*, pr.first_name || ' ' || pr.last_name || ', ' || pr.credential AS primary_provider
      FROM patients p LEFT JOIN providers pr ON pr.id = p.primary_provider_id
      WHERE p.id = ?`, [id]);
    if (!patient) return undefined;
    patient.insurance = this.db.all('SELECT * FROM insurance WHERE patient_id = ? ORDER BY coverage = \'secondary\'', [id]);
    patient.appointments = this.db.all(`${APPOINTMENT_SELECT} WHERE a.patient_id = ? ORDER BY a.starts_at DESC`, [id]);
    patient.documents = this.documents(id);
    return patient;
  }

  /** Creates a patient and their insurance in one transaction; returns the new id. */
  createPatient(data) {
    return this.transaction(() => {
      const { next } = this.db.get("SELECT COALESCE(MAX(CAST(SUBSTR(mrn, 4) AS INTEGER)), 104199) + 1 AS next FROM patients");
      const fields = PATIENT_FIELDS.filter((f) => data[f] !== undefined && data[f] !== '');
      const id = this.db.run(
        `INSERT INTO patients (mrn, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')})`,
        [`GH-${next}`, ...fields.map((f) => data[f])]).lastId;
      this.saveInsurance(id, data.insurance ?? []);
      return id;
    });
  }

  updatePatient(id, data) {
    return this.transaction(() => {
      const fields = PATIENT_FIELDS.filter((f) => data[f] !== undefined);
      if (fields.length) {
        this.db.run(`UPDATE patients SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map((f) => (data[f] === '' ? null : data[f])), id]);
      }
      if (data.insurance) this.saveInsurance(id, data.insurance);
      return this.db.get('SELECT changes() AS n').n >= 0;
    });
  }

  /** Insert or replace the primary/secondary plans (an empty payer removes that plan). */
  saveInsurance(patientId, plans) {
    for (const plan of plans) {
      if (!plan.payer) {
        this.db.run('DELETE FROM insurance WHERE patient_id = ? AND coverage = ?', [patientId, plan.coverage]);
        continue;
      }
      this.db.run(`
        INSERT INTO insurance (patient_id, coverage, ${INSURANCE_FIELDS.join(', ')})
        VALUES (?, ?, ${INSURANCE_FIELDS.map(() => '?').join(', ')})
        ON CONFLICT (patient_id, coverage) DO UPDATE SET
          ${INSURANCE_FIELDS.map((f) => `${f} = excluded.${f}`).join(', ')}`,
      [patientId, plan.coverage, ...INSURANCE_FIELDS.map((f) => (plan[f] === '' || plan[f] == null ? (f === 'subscriber_relation' ? 'self' : null) : plan[f]))]);
    }
  }

  /** Saves (or with null, removes) the patient's photo. */
  setPhoto(id, photo) {
    return this.db.run('UPDATE patients SET photo = ? WHERE id = ?', [photo, id]).changes === 1;
  }

  // ---------- Documents ----------

  documents(patientId) {
    return this.db.all(`
      SELECT id, patient_id AS patientId, title, category, file_name AS fileName, mime_type AS mimeType,
             size_bytes AS size, uploaded_at AS uploadedAt
      FROM documents WHERE patient_id = ? ORDER BY uploaded_at DESC, id DESC`, [patientId]);
  }

  /** One document including its bytes (Uint8Array). */
  document(id) {
    return this.db.get(`
      SELECT id, patient_id AS patientId, title, category, file_name AS fileName, mime_type AS mimeType,
             size_bytes AS size, uploaded_at AS uploadedAt, data
      FROM documents WHERE id = ?`, [id]);
  }

  addDocument({ patientId, title, category, fileName, mimeType, data, uploadedAt }) {
    return this.db.run(`
      INSERT INTO documents (patient_id, title, category, file_name, mime_type, size_bytes, data, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%d %H:%M', 'now', 'localtime')))`,
    [patientId, title.trim(), category, fileName, mimeType, data.length, data, uploadedAt ?? null]).lastId;
  }

  deleteDocument(id) {
    return this.db.run('DELETE FROM documents WHERE id = ?', [id]).changes === 1;
  }

  // ---------- Appointments ----------

  /** Appointments from `from` to `to` (inclusive dates), optionally for one provider. */
  appointments({ from, to = from, providerId } = {}) {
    return this.db.all(`${APPOINTMENT_SELECT}
      WHERE date(a.starts_at) BETWEEN ? AND ?
        AND (? IS NULL OR a.provider_id = ?)
      ORDER BY a.starts_at, provider`, [from, to, providerId ?? null, providerId ?? null]);
  }

  appointment(id) {
    return this.db.get(`${APPOINTMENT_SELECT} WHERE a.id = ?`, [id]);
  }

  /** Number of active appointments per day, for the month view. */
  dailyCounts({ from, to, providerId } = {}) {
    return this.db.all(`
      SELECT date(starts_at) AS date,
             COUNT(*) AS total,
             SUM(status = 'scheduled') AS scheduled,
             SUM(status = 'completed') AS completed,
             SUM(status = 'no_show')   AS noShows
      FROM appointments
      WHERE date(starts_at) BETWEEN ? AND ? AND status <> 'cancelled'
        AND (? IS NULL OR provider_id = ?)
      GROUP BY date(starts_at)
      ORDER BY date`, [from, to, providerId ?? null, providerId ?? null]);
  }

  /**
   * Reasons a booking can't happen, in plain words (empty list = it can be booked).
   * Checks clinic hours, the provider's hours and lunch, and overlaps for the provider and the patient.
   */
  bookingProblems({ patientId, providerId, startsAt, duration = 30, ignoreId = null }, now = null) {
    const [date, time] = startsAt.split(' ');
    const start = toMinutes(time);
    const end = start + duration;
    const weekday = weekdayOf(date);
    const problems = [];

    const clinic = this.db.get('SELECT opens, closes FROM clinic_hours WHERE weekday = ?', [weekday]);
    if (!clinic?.opens) return ['The clinic is closed on weekends. Business hours are Monday–Friday.'];
    if (start < toMinutes(clinic.opens) || end > toMinutes(clinic.closes)) {
      problems.push(`Outside business hours (${clinic.opens}–${clinic.closes}).`);
    }
    const hours = this.hoursFor(providerId, weekday);
    if (!hours) return [...problems, 'This provider does not work on that day.'];
    if (start < toMinutes(hours.starts) || end > toMinutes(hours.ends)) {
      problems.push(`Outside this provider's hours (${hours.starts}–${hours.ends}).`);
    }
    if (hours.lunchStarts && start < toMinutes(hours.lunchEnds) && end > toMinutes(hours.lunchStarts)) {
      problems.push(`Overlaps the provider's lunch break (${hours.lunchStarts}–${hours.lunchEnds}).`);
    }
    if (now && startsAt < now) problems.push('That time has already passed.');

    // Overlap: an existing visit starts before this one ends AND ends after this one starts
    const overlapSql = (column) => `
      SELECT starts_at AS startsAt FROM appointments
      WHERE ${column} = ? AND status <> 'cancelled' AND id IS NOT ?
        AND date(starts_at) = ?
        AND starts_at < ?
        AND strftime('%Y-%m-%d %H:%M', starts_at, '+' || duration_min || ' minutes') > ?
      LIMIT 1`;
    const endsAt = `${date} ${toTime(end)}`;
    const providerClash = this.db.get(overlapSql('provider_id'), [providerId, ignoreId, date, endsAt, startsAt]);
    if (providerClash) problems.push(`The provider already has a visit at ${providerClash.startsAt.slice(11)}.`);
    if (patientId) {
      const patientClash = this.db.get(overlapSql('patient_id'), [patientId, ignoreId, date, endsAt, startsAt]);
      if (patientClash) problems.push(`The patient already has a visit at ${patientClash.startsAt.slice(11)}.`);
    }
    return problems;
  }

  /** Open start times ('HH:MM') for a provider on a date, for a visit of `duration` minutes. */
  openSlots({ providerId, date, duration = 30 }, now = null) {
    const hours = this.hoursFor(providerId, weekdayOf(date));
    if (!hours) return [];
    const busy = this.db.all(`
      SELECT time(starts_at) AS starts, duration_min AS minutes FROM appointments
      WHERE provider_id = ? AND date(starts_at) = ? AND status <> 'cancelled'`, [providerId, date])
      .map((a) => [toMinutes(a.starts), toMinutes(a.starts) + a.minutes]);
    if (hours.lunchStarts) busy.push([toMinutes(hours.lunchStarts), toMinutes(hours.lunchEnds)]);
    const slots = [];
    for (let t = toMinutes(hours.starts); t + duration <= toMinutes(hours.ends); t += 15) {
      const free = busy.every(([s, e]) => t + duration <= s || t >= e);
      if (free && (!now || `${date} ${toTime(t)}` >= now)) slots.push(toTime(t));
    }
    return slots;
  }

  createAppointment({ patientId, providerId, startsAt, duration = 30, visitType = 'Follow-up', reason }) {
    return this.db.run(`
      INSERT INTO appointments (patient_id, provider_id, starts_at, duration_min, visit_type, reason)
      VALUES (?, ?, ?, ?, ?, ?)`, [patientId, providerId, startsAt, duration, visitType, reason.trim()]).lastId;
  }

  updateStatus(id, status) {
    return this.db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id]).changes === 1;
  }

  // ---------- Reports ----------

  providerWorkload({ from = '0000-01-01', to = '9999-12-31' } = {}) {
    return this.db.all(`
      SELECT pr.id, pr.first_name || ' ' || pr.last_name || ', ' || pr.credential AS provider, pr.specialty,
             COUNT(a.id) AS total,
             COALESCE(SUM(a.status = 'completed'), 0) AS completed,
             COALESCE(SUM(a.status = 'no_show'), 0)   AS noShows,
             ROUND(100.0 * SUM(a.status = 'no_show') / NULLIF(SUM(a.status IN ('completed', 'no_show')), 0), 1) AS noShowPct
      FROM providers pr
      LEFT JOIN appointments a ON a.provider_id = pr.id
                              AND a.status <> 'cancelled'
                              AND date(a.starts_at) BETWEEN ? AND ?
      GROUP BY pr.id
      ORDER BY total DESC, provider`, [from, to]);
  }

  /** Headline numbers for the dashboard. */
  summary(today) {
    return this.db.get(`
      SELECT (SELECT COUNT(*) FROM patients)  AS patients,
             (SELECT COUNT(*) FROM providers) AS providers,
             (SELECT COUNT(*) FROM appointments WHERE date(starts_at) = ? AND status <> 'cancelled') AS today,
             (SELECT COUNT(*) FROM appointments WHERE date(starts_at) = ? AND status = 'checked_in') AS checkedIn,
             (SELECT ROUND(100.0 * SUM(status = 'no_show') / NULLIF(SUM(status IN ('completed', 'no_show')), 0), 1)
                FROM appointments) AS noShowPct`, [today, today]);
  }
}
