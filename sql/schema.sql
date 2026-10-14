-- Clinic Appointment Tracker schema
-- Three related tables: patients and providers, linked by appointments.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS providers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name   TEXT    NOT NULL,
  specialty   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  birth_date  TEXT    NOT NULL,          -- YYYY-MM-DD
  phone       TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id   INTEGER NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  provider_id  INTEGER NOT NULL REFERENCES providers(id),
  starts_at    TEXT    NOT NULL,         -- YYYY-MM-DD HH:MM
  reason       TEXT    NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled', 'checked_in', 'completed', 'no_show', 'cancelled')),
  UNIQUE (provider_id, starts_at)        -- a provider can't be double-booked
);

CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient   ON appointments(patient_id);
