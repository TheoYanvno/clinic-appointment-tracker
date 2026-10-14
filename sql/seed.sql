-- Sample data (all names are fictional)
INSERT INTO providers (full_name, specialty) VALUES
  ('Dr. Maya Chen',     'Family Medicine'),
  ('Dr. Luis Ortega',   'Internal Medicine'),
  ('Dr. Priya Raman',   'Pediatrics');

INSERT INTO patients (first_name, last_name, birth_date, phone) VALUES
  ('Jordan',  'Lee',      '1988-04-12', '407-555-0101'),
  ('Avery',   'Brooks',   '1975-09-30', '407-555-0102'),
  ('Sam',     'Patel',    '2015-01-22', '407-555-0103'),
  ('Taylor',  'Nguyen',   '1992-11-05', '407-555-0104'),
  ('Morgan',  'Diaz',     '1960-07-18', '407-555-0105'),
  ('Casey',   'Johnson',  '2001-03-09', NULL);

INSERT INTO appointments (patient_id, provider_id, starts_at, reason, status) VALUES
  (1, 1, '2026-10-19 08:00', 'Annual physical',      'completed'),
  (2, 2, '2026-10-19 08:30', 'Blood pressure check', 'completed'),
  (3, 3, '2026-10-19 09:00', 'Well-child visit',     'no_show'),
  (4, 1, '2026-10-19 09:30', 'Follow-up',            'completed'),
  (5, 2, '2026-10-20 08:00', 'Diabetes management',  'scheduled'),
  (1, 1, '2026-10-20 10:00', 'Lab review',           'scheduled'),
  (2, 2, '2026-10-20 10:30', 'Medication refill',    'cancelled'),
  (4, 3, '2026-10-21 13:00', 'Vaccination',          'scheduled');
