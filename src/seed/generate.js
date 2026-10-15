// Fills an empty database with a realistic clinic: providers and their hours, DC character patients,
// generated patients with insurance, and six weeks of appointments around today
// (two weeks back, this week, three weeks ahead). A seeded random generator makes it repeatable.
import { PROVIDERS, PRIMARY_CARE, REASONS, PAYERS, DC_PATIENTS, FIRST_NAMES, LAST_NAMES, STREETS, ALLERGIES, LANGUAGES } from './data.js';
import { addDays, weekdayOf, toDateString, toMinutes, toTime } from '../schedule.js';

/** Small, fast, repeatable random number generator (mulberry32). */
export function randomGenerator(seed = 2026) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.int = (min, max) => min + Math.floor(next() * (max - min + 1));
  next.chance = (p) => next() < p;
  return next;
}

const pad = (n, size = 2) => String(n).padStart(size, '0');
const phone = (n) => `555-01${pad(n % 100)}`;          // 555-0100 to 555-0199 are reserved for fiction
const LUNCH = ['12:00', '13:00'];

/** Monday of the week that contains `date` (or the next Monday on a weekend). */
function mondayOf(date) {
  const day = weekdayOf(date);
  if (day === 0) return addDays(date, 1);
  if (day === 6) return addDays(date, 2);
  return addDays(date, 1 - day);
}

/** The nth weekday from `date` (0 = date itself, or the next weekday if date is a weekend). Negative goes back. */
function businessDay(date, n) {
  let d = date;
  while ([0, 6].includes(weekdayOf(d))) d = addDays(d, 1);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0;) {
    d = addDays(d, step);
    if (![0, 6].includes(weekdayOf(d))) left--;
  }
  return d;
}

/**
 * @param db     a driver (node:sqlite or sql.js)
 * @param today  'YYYY-MM-DD'
 * @param now    'YYYY-MM-DD HH:MM' used to decide which visits already happened
 */
export function seedDatabase(db, { today = toDateString(new Date()), now = `${today} 12:00`, generatedPatients = 2400, seed = 2026 } = {}) {
  const rand = randomGenerator(seed);
  const insert = (sql, params) => db.run(sql, params).lastId;
  db.exec('BEGIN');
  try {
    // ---- Business hours: Monday–Friday 8:00–17:00, closed on weekends
    for (let day = 0; day <= 6; day++) {
      const open = day >= 1 && day <= 5;
      db.run('INSERT INTO clinic_hours (weekday, opens, closes) VALUES (?, ?, ?)', [day, open ? '08:00' : null, open ? '17:00' : null]);
    }

    // ---- Providers and their weekly hours
    const providers = PROVIDERS.map((p) => {
      const id = insert('INSERT INTO providers (first_name, last_name, credential, specialty, room) VALUES (?, ?, ?, ?, ?)',
        [p.first, p.last, p.credential, p.specialty, p.room]);
      const days = [1, 2, 3, 4, 5].filter((d) => !(p.off ?? []).includes(d));
      for (const day of days) {
        db.run('INSERT INTO provider_hours (provider_id, weekday, starts, ends, lunch_starts, lunch_ends) VALUES (?, ?, ?, ?, ?, ?)',
          [id, day, p.hours[0], p.hours[1], LUNCH[0], LUNCH[1]]);
      }
      return { ...p, id, days };
    });
    const byLast = Object.fromEntries(providers.map((p) => [p.last, p]));
    const primaryCare = providers.filter((p) => PRIMARY_CARE.includes(p.specialty));

    // ---- Patients
    let mrn = 104200;
    const patients = [];
    const addPatient = (p) => {
      const id = insert(`
        INSERT INTO patients (mrn, first_name, last_name, birth_date, sex, phone, email, address, city, state, zip,
                              preferred_language, emergency_name, emergency_relation, emergency_phone,
                              primary_provider_id, allergies, medications, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`GH-${mrn++}`, p.first, p.last, p.born, p.sex, p.phone, p.email, p.address, p.city, p.state, p.zip,
        p.language, p.emergency?.[0] ?? null, p.emergency?.[1] ?? null, p.emergency?.[2] ?? null,
        p.primaryId, p.allergies, p.medications ?? null, p.notes ?? null, `${addDays(today, -rand.int(30, 1500))} 09:00`]);
      const payer = PAYERS.find((x) => x.payer === p.payer) ?? rand.pick(PAYERS);
      db.run(`INSERT INTO insurance (patient_id, coverage, payer, plan_name, member_id, group_number, subscriber_name, subscriber_relation, copay)
              VALUES (?, 'primary', ?, ?, ?, ?, ?, ?, ?)`,
      [id, payer.payer, rand.pick(payer.plans), `${payer.payer.slice(0, 3).toUpperCase()}${rand.int(10000000, 99999999)}`,
        ['Medicare', 'Medicaid'].includes(payer.payer) ? null : `G${rand.int(1000, 9999)}`,
        p.subscriber ?? `${p.first} ${p.last}`, p.relation ?? 'self', [0, 10, 20, 25, 30, 40][rand.int(0, 5)]]);
      const age = Number(today.slice(0, 4)) - Number(p.born.slice(0, 4));
      const patient = { ...p, id, age };
      patients.push(patient);
      return patient;
    };

    const dc = DC_PATIENTS.map((c, i) => addPatient({
      ...c,
      phone: phone(i),
      email: `${c.first}.${c.last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
      address: c.address ?? `${rand.int(10, 999)} ${rand.pick(STREETS)}`,
      city: c.city ?? 'Gotham', state: c.state ?? 'NJ', zip: `07${rand.int(100, 199)}`,
      language: c.preferred_language ?? 'English',
      primaryId: byLast[c.primary].id,
      allergies: c.allergies ?? rand.pick(ALLERGIES),
    }));

    for (let i = 0; i < generatedPatients; i++) {
      const sex = rand.chance(0.52) ? 'F' : 'M';
      const first = rand.pick(FIRST_NAMES[sex]);
      const last = rand.pick(LAST_NAMES);
      const child = rand.chance(0.2);
      const year = Number(today.slice(0, 4)) - (child ? rand.int(1, 17) : rand.int(18, 90));
      const born = `${year}-${pad(rand.int(1, 12))}-${pad(rand.int(1, 28))}`;
      const pcp = child ? rand.pick(primaryCare.filter((p) => p.specialty === 'Pediatrics'))
        : rand.pick(primaryCare.filter((p) => p.specialty !== 'Pediatrics' && (p.specialty !== "Women's Health" || sex === 'F')));
      addPatient({
        first, last, sex, born,
        phone: phone(rand.int(0, 99)),
        email: `${first}.${last}${rand.int(1, 99)}`.toLowerCase() + '@example.com',
        address: `${rand.int(10, 9999)} ${rand.pick(STREETS)}`, city: 'Gotham', state: 'NJ', zip: `07${rand.int(100, 199)}`,
        language: rand.pick(LANGUAGES),
        emergency: [`${rand.pick(FIRST_NAMES[rand.chance(0.5) ? 'F' : 'M'])} ${last}`, child ? 'Parent' : rand.pick(['Spouse', 'Parent', 'Sibling', 'Child', 'Friend']), phone(rand.int(0, 99))],
        primaryId: pcp.id,
        allergies: rand.pick(ALLERGIES),
        payer: year <= Number(today.slice(0, 4)) - 65 ? 'Medicare' : rand.pick(PAYERS.filter((x) => x.payer !== 'Medicare')).payer,
        relation: child ? 'parent' : 'self',
        subscriber: child ? `Parent of ${first} ${last}` : undefined,
      });
    }

    // ---- Appointments
    const booked = new Set();                                    // "providerId|date|HH:MM" per 15-minute block
    const isFree = (pid, date, start, minutes) => {
      for (let t = toMinutes(start); t < toMinutes(start) + minutes; t += 15) if (booked.has(`${pid}|${date}|${toTime(t)}`)) return false;
      return true;
    };
    const take = (pid, date, start, minutes) => {
      for (let t = toMinutes(start); t < toMinutes(start) + minutes; t += 15) booked.add(`${pid}|${date}|${toTime(t)}`);
    };
    const statusFor = (date, start, minutes) => {
      const startsAt = `${date} ${start}`;
      const endsAt = `${date} ${toTime(toMinutes(start) + minutes)}`;
      if (endsAt <= now) return rand.chance(0.06) ? 'no_show' : rand.chance(0.06) ? 'cancelled' : 'completed';
      if (startsAt <= now) return 'checked_in';
      return rand.chance(0.05) ? 'cancelled' : 'scheduled';
    };
    const addAppointment = (patientId, provider, date, start, minutes, type, reason, status = statusFor(date, start, minutes)) => {
      if (status !== 'cancelled') take(provider.id, date, start, minutes);
      db.run(`INSERT INTO appointments (patient_id, provider_id, starts_at, duration_min, visit_type, reason, status)
              VALUES (?, ?, ?, ?, ?, ?, ?)`, [patientId, provider.id, `${date} ${start}`, minutes, type, reason, status]);
    };

    // DC characters' themed visits first, moved to the next day the provider works if needed
    DC_PATIENTS.forEach((c, i) => {
      const [last, offset, time, type, reason] = c.visit;
      const provider = byLast[last];
      let date = businessDay(today, offset);
      while (!provider.days.includes(weekdayOf(date))) date = businessDay(date, 1);
      const minutes = type === 'New patient' ? 45 : 30;
      if (isFree(provider.id, date, time, minutes)) addAppointment(dc[i].id, provider, date, time, minutes, type, reason);
    });

    const adults = patients.filter((p) => p.age >= 18);
    const kids = patients.filter((p) => p.age < 18);
    const women = adults.filter((p) => p.sex === 'F');
    const poolFor = (provider) => provider.specialty === 'Pediatrics' ? kids
      : ['OB/GYN', "Women's Health"].includes(provider.specialty) ? women : adults;

    const first = addDays(mondayOf(today), -14);
    for (let d = 0; d < 42; d++) {
      const date = addDays(first, d);
      const weekday = weekdayOf(date);
      for (const provider of providers) {
        if (!provider.days.includes(weekday)) continue;
        const pool = poolFor(provider);
        let t = toMinutes(provider.hours[0]);
        const end = toMinutes(provider.hours[1]);
        while (t < end) {
          if (t >= toMinutes(LUNCH[0]) && t < toMinutes(LUNCH[1])) { t = toMinutes(LUNCH[1]); continue; }
          const roll = rand();
          const [type, minutes] = roll < 0.42 ? ['Follow-up', rand.pick([15, 30])]
            : roll < 0.57 ? ['Sick visit', rand.pick([15, 30])]
            : roll < 0.69 ? ['Annual physical', 30]
            : roll < 0.79 ? ['New patient', rand.pick([45, 60])]
            : roll < 0.89 ? ['Telehealth', rand.pick([15, 30])]
            : [['Dermatology', 'Orthopedics', 'Gastroenterology', 'Sports Medicine'].includes(provider.specialty) ? 'Procedure' : 'Follow-up', 30];
          const fits = t + minutes <= end && (t + minutes <= toMinutes(LUNCH[0]) || t >= toMinutes(LUNCH[1]));
          if (fits && rand.chance(0.72) && isFree(provider.id, date, toTime(t), minutes)) {
            const reason = type === 'Annual physical' ? (provider.specialty === 'Pediatrics' ? 'Well-child visit' : 'Annual physical')
              : type === 'New patient' ? `New patient: ${rand.pick(REASONS[provider.specialty]).toLowerCase()}`
              : rand.pick(REASONS[provider.specialty]);
            addAppointment(rand.pick(pool).id, provider, date, toTime(t), minutes, type, reason);
            t += minutes;
          } else {
            t += 15;
          }
        }
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
