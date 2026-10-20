-- Gotham Hospital Patient Portal schema (SQLite)
-- Clinic hours, providers and their weekly hours, patients with insurance and documents,
-- and appointments that link patients to providers.

PRAGMA foreign_keys = ON;

-- Business hours by weekday (0 = Sunday … 6 = Saturday, the same numbering as strftime('%w')).
-- NULL opens/closes means closed.
CREATE TABLE IF NOT EXISTS clinic_hours (
  weekday  INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  opens    TEXT,                                   -- HH:MM
  closes   TEXT,
  CHECK ((opens IS NULL AND closes IS NULL) OR opens < closes)
);

CREATE TABLE IF NOT EXISTS providers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name     TEXT    NOT NULL,
  last_name      TEXT    NOT NULL,
  credential     TEXT    NOT NULL CHECK (credential IN ('MD', 'DO', 'NP', 'PA')),
  specialty      TEXT    NOT NULL,
  room           TEXT,
  accepting_new  INTEGER NOT NULL DEFAULT 1 CHECK (accepting_new IN (0, 1))
);

-- Each provider's working hours on the days they work (Monday–Friday only)
CREATE TABLE IF NOT EXISTS provider_hours (
  provider_id  INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  weekday      INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  starts       TEXT    NOT NULL,                   -- HH:MM
  ends         TEXT    NOT NULL,
  lunch_starts TEXT,                               -- optional lunch break
  lunch_ends   TEXT,
  PRIMARY KEY (provider_id, weekday),
  CHECK (starts < ends)
);

CREATE TABLE IF NOT EXISTS patients (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn                  TEXT    NOT NULL UNIQUE,    -- medical record number, e.g. GH-104233
  first_name           TEXT    NOT NULL,
  last_name            TEXT    NOT NULL,
  preferred_name       TEXT,
  birth_date           TEXT    NOT NULL,           -- YYYY-MM-DD
  sex                  TEXT    NOT NULL CHECK (sex IN ('F', 'M', 'X')),
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  zip                  TEXT,
  preferred_language   TEXT    NOT NULL DEFAULT 'English',
  emergency_name       TEXT,
  emergency_relation   TEXT,
  emergency_phone      TEXT,
  primary_provider_id  INTEGER REFERENCES providers(id) ON DELETE SET NULL,
  allergies            TEXT,
  medications          TEXT,
  notes                TEXT,
  photo                TEXT,                       -- small JPEG as a data URL, resized in the browser
  created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS insurance (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id          INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  coverage            TEXT    NOT NULL CHECK (coverage IN ('primary', 'secondary')),
  payer               TEXT    NOT NULL,
  plan_name           TEXT,
  member_id           TEXT    NOT NULL,
  group_number        TEXT,
  subscriber_name     TEXT,
  subscriber_relation TEXT    NOT NULL DEFAULT 'self' CHECK (subscriber_relation IN ('self', 'spouse', 'parent', 'other')),
  copay               REAL    CHECK (copay >= 0),
  UNIQUE (patient_id, coverage)                    -- one primary and one secondary plan at most
);

CREATE TABLE IF NOT EXISTS appointments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
  provider_id   INTEGER NOT NULL REFERENCES providers(id),
  starts_at     TEXT    NOT NULL,                  -- YYYY-MM-DD HH:MM
  duration_min  INTEGER NOT NULL DEFAULT 30 CHECK (duration_min IN (15, 30, 45, 60)),
  visit_type    TEXT    NOT NULL DEFAULT 'Follow-up'
                CHECK (visit_type IN ('New patient', 'Follow-up', 'Annual physical', 'Sick visit', 'Procedure', 'Telehealth')),
  reason        TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'checked_in', 'completed', 'no_show', 'cancelled'))
);

-- A provider can't have two active appointments starting at the same time
-- (a partial index, so a cancelled slot can be booked again). Overlaps are checked in code.
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_start ON appointments(provider_id, starts_at) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient   ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_name          ON patients(last_name, first_name);

-- Uploaded medical documents, stored in the database as BLOBs
CREATE TABLE IF NOT EXISTS documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id   INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title        TEXT    NOT NULL,
  category     TEXT    NOT NULL CHECK (category IN ('Lab result', 'Imaging', 'Referral', 'Insurance card', 'Visit note', 'Consent form', 'Other')),
  file_name    TEXT    NOT NULL,
  mime_type    TEXT    NOT NULL,
  size_bytes   INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),   -- 5 MB limit
  uploaded_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M', 'now', 'localtime')),
  data         BLOB    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);

-- Staff accounts for the hidden sign-in. Only a salted PBKDF2 hash of each password is kept.
CREATE TABLE IF NOT EXISTS staff (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name   TEXT    NOT NULL,
  role           TEXT    NOT NULL CHECK (role IN ('Clinic manager', 'Front desk')),
  password_salt  TEXT    NOT NULL,
  password_hash  TEXT    NOT NULL,
  iterations     INTEGER NOT NULL
);

-- One row per signed-in browser. The token is random; signing out deletes the row.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  staff_id    INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL
);
