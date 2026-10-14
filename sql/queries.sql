-- Report queries used by the app (and good SQL practice).

-- 1) Daily schedule: INNER JOIN across all three tables
SELECT a.id, a.starts_at, p.first_name || ' ' || p.last_name AS patient,
       pr.full_name AS provider, a.reason, a.status
FROM appointments a
JOIN patients  p  ON p.id  = a.patient_id
JOIN providers pr ON pr.id = a.provider_id
WHERE date(a.starts_at) = '2026-10-19'
ORDER BY a.starts_at;

-- 2) Provider workload: GROUP BY with conditional counts
SELECT pr.full_name,
       COUNT(a.id)                                         AS total,
       SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN a.status = 'no_show'   THEN 1 ELSE 0 END) AS no_shows
FROM providers pr
LEFT JOIN appointments a ON a.provider_id = pr.id
GROUP BY pr.id
ORDER BY total DESC;

-- 3) Patients with more than one appointment: HAVING filters groups
SELECT p.id, p.first_name, p.last_name, COUNT(*) AS visits
FROM patients p
JOIN appointments a ON a.patient_id = p.id
GROUP BY p.id
HAVING COUNT(*) > 1;

-- 4) Patients with no appointments: LEFT JOIN + IS NULL
SELECT p.id, p.first_name, p.last_name
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.id
WHERE a.id IS NULL;

-- 5) No-show rate: subquery
SELECT ROUND(100.0 * (SELECT COUNT(*) FROM appointments WHERE status = 'no_show')
             / COUNT(*), 1) AS no_show_pct
FROM appointments
WHERE status IN ('completed', 'no_show');
