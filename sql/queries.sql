-- Report queries for the Gotham Hospital Patient Portal (good SQL practice; run them in any SQLite tool
-- against clinic.db, created by `npm start`).

-- 1) A day's schedule: INNER JOIN across three tables
SELECT a.starts_at, a.duration_min, p.first_name || ' ' || p.last_name AS patient,
       pr.first_name || ' ' || pr.last_name || ', ' || pr.credential AS provider, a.visit_type, a.status
FROM appointments a
JOIN patients  p  ON p.id  = a.patient_id
JOIN providers pr ON pr.id = a.provider_id
WHERE date(a.starts_at) = date('now', 'localtime')
ORDER BY a.starts_at, provider;

-- 2) Provider workload with conditional counts and a no-show rate (NULLIF avoids dividing by zero)
SELECT pr.last_name, pr.credential,
       COUNT(a.id)                                      AS total,
       SUM(a.status = 'completed')                      AS completed,
       SUM(a.status = 'no_show')                        AS no_shows,
       ROUND(100.0 * SUM(a.status = 'no_show') / NULLIF(SUM(a.status IN ('completed', 'no_show')), 0), 1) AS no_show_pct
FROM providers pr
LEFT JOIN appointments a ON a.provider_id = pr.id AND a.status <> 'cancelled'
GROUP BY pr.id
ORDER BY total DESC;

-- 3) Appointments per credential type (MD, DO, NP, PA)
SELECT pr.credential, COUNT(*) AS visits, ROUND(AVG(a.duration_min), 1) AS avg_minutes
FROM appointments a JOIN providers pr ON pr.id = a.provider_id
WHERE a.status = 'completed'
GROUP BY pr.credential
ORDER BY visits DESC;

-- 4) Booked hours vs. available hours per provider this week (utilization)
WITH week AS (
  SELECT date('now', 'localtime', 'weekday 1', '-7 days') AS monday
), booked AS (
  SELECT provider_id, SUM(duration_min) / 60.0 AS hours
  FROM appointments, week
  WHERE status <> 'cancelled' AND date(starts_at) BETWEEN monday AND date(monday, '+4 days')
  GROUP BY provider_id
), available AS (
  SELECT provider_id,
         SUM((strftime('%s', '2000-01-01 ' || ends) - strftime('%s', '2000-01-01 ' || starts)) / 3600.0 - 1) AS hours
  FROM provider_hours GROUP BY provider_id
)
SELECT pr.last_name, pr.credential, ROUND(b.hours, 1) AS booked, ROUND(av.hours, 1) AS available,
       ROUND(100 * b.hours / av.hours) AS utilization_pct
FROM providers pr
JOIN available av ON av.provider_id = pr.id
LEFT JOIN booked b ON b.provider_id = pr.id
ORDER BY utilization_pct DESC;

-- 5) Patients with no appointments: LEFT JOIN + IS NULL
SELECT p.mrn, p.first_name, p.last_name
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.id
WHERE a.id IS NULL;

-- 6) Patients by primary insurance payer
SELECT i.payer, COUNT(*) AS patients
FROM insurance i
WHERE i.coverage = 'primary'
GROUP BY i.payer
ORDER BY patients DESC;

-- 7) Patients seen 3+ times in the last 30 days: HAVING filters groups
SELECT p.mrn, p.first_name || ' ' || p.last_name AS patient, COUNT(*) AS visits
FROM patients p
JOIN appointments a ON a.patient_id = p.id
WHERE a.status = 'completed' AND a.starts_at >= date('now', 'localtime', '-30 days')
GROUP BY p.id
HAVING COUNT(*) >= 3
ORDER BY visits DESC;
