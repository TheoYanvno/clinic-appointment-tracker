// REST API routes as one plain function: (request) → { status, body }.
// The Node server calls it for real HTTP requests, and the live demo calls it directly in the browser,
// so both use the same validation, status codes and SQL.
import { validateAppointment, validatePatient, validatePhoto, validateDocument, isValidStatus } from './validation.js';
import { toBase64, fromBase64 } from './base64.js';
import { toDateString, nowString } from './schedule.js';
import { PERMISSIONS } from './seed/staff.js';

const ok = (body, status = 200) => ({ status, body });
const fail = (status, ...errors) => ({ status, body: { errors } });

/** Turns database errors into messages a person can act on. */
function friendly(err) {
  const msg = String(err.message || err);
  if (msg.includes('uq_provider_start') || msg.includes('UNIQUE constraint failed: appointments')) return 'That provider already has an appointment at that time.';
  if (msg.includes('FOREIGN KEY')) return 'That patient or provider does not exist.';
  if (msg.includes('CHECK constraint')) return 'One of the values is not allowed.';
  if (msg.includes('UNIQUE constraint failed: insurance')) return 'A patient can have only one primary and one secondary plan.';
  return msg;
}

const SIGN_IN = 'Please sign in';
const NOT_ALLOWED = 'Your sign-in does not have access to this';

// Which permission each part of the API needs (see PERMISSIONS in src/seed/staff.js).
// Customer service can see patient names to book visits, but only medical staff can open a patient's chart.
const RULES = [
  [/^\/api\/reports\//, () => 'reports'],
  [/^\/api\/documents\/\d+$/, (method) => (method === 'DELETE' ? 'documents:delete' : 'patients')],
  [/^\/api\/patients$/, (method) => (method === 'GET' ? 'patients:search' : 'patients')],
  [/^\/api\/patients\//, () => 'patients'],
  [/^\/api\/appointments(\/|$)/, (method) => (method === 'GET' ? 'schedule:read' : 'schedule:write')],
  [/^\/api\/(clinic|providers)(\/|$)/, () => 'schedule:read'],
];

export const can = (staff, permission) => Boolean(staff && PERMISSIONS[staff.role]?.includes(permission));

/**
 * `token` is the staff session, if any: the Node server reads it from an HttpOnly cookie,
 * the live demo from this browser's storage. Everything except signing in needs a session (401),
 * and the session's role must allow the request (403).
 */
export function handle(repo, { method = 'GET', path, query = {}, body = {}, token = null, today = toDateString(new Date()), now = nowString() }) {
  const route = (verb, pattern) => {
    if (method !== verb) return null;
    const match = path.match(pattern);
    return match ? match.slice(1).map(Number) : null;
  };
  let params;
  try {
    const staff = repo.sessionStaff(token, now);

    // ---- Staff sign-in
    if (route('POST', /^\/api\/login$/)) {
      if (!body.username || !body.password) return fail(400, 'Enter your username and password');
      const session = repo.signIn(body.username, body.password, now);
      return session ? ok(session) : fail(401, 'Wrong username or password');
    }
    if (route('POST', /^\/api\/logout$/)) {
      if (token) repo.signOut(token);
      return ok({ ok: true });
    }
    if (route('GET', /^\/api\/me$/)) return ok({ staff });      // null when signed out (not an error)

    // ---- Everything below needs a signed-in role that's allowed to do it
    const rule = RULES.find(([pattern]) => pattern.test(path));
    if (rule) {
      if (!staff) return fail(401, SIGN_IN);
      if (!can(staff, rule[1](method))) return fail(403, NOT_ALLOWED);
    }

    // ---- Clinic and providers
    if (route('GET', /^\/api\/clinic$/)) return ok({ hours: repo.clinicHours(), summary: repo.summary(today), today, now });
    if (route('GET', /^\/api\/providers$/)) return ok(repo.providers({ credential: query.credential || null, q: query.q || null }));
    if ((params = route('GET', /^\/api\/providers\/(\d+)\/slots$/))) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date ?? '')) return fail(400, 'date must look like YYYY-MM-DD');
      return ok(repo.openSlots({ providerId: params[0], date: query.date, duration: Number(query.duration) || 30 }, now));
    }
    if ((params = route('GET', /^\/api\/providers\/(\d+)$/))) {
      const provider = repo.provider(params[0]);
      return provider ? ok(provider) : fail(404, 'Provider not found');
    }

    // ---- Patients
    if (route('GET', /^\/api\/patients$/)) return ok(repo.searchPatients(query.q ?? '', Math.min(Number(query.limit) || 50, 200)));
    if ((params = route('GET', /^\/api\/patients\/(\d+)$/))) {
      const patient = repo.patient(params[0]);
      return patient ? ok(patient) : fail(404, 'Patient not found');
    }
    if (route('POST', /^\/api\/patients$/)) {
      const errors = validatePatient(body, { today });
      if (errors.length) return fail(400, ...errors);
      const id = repo.createPatient(body);
      return ok(repo.patient(id), 201);
    }
    if ((params = route('PUT', /^\/api\/patients\/(\d+)$/))) {
      if (!repo.patient(params[0])) return fail(404, 'Patient not found');
      const errors = validatePatient(body, { today, partial: true });
      if (errors.length) return fail(400, ...errors);
      repo.updatePatient(params[0], body);
      return ok(repo.patient(params[0]));
    }

    if ((params = route('PUT', /^\/api\/patients\/(\d+)\/photo$/))) {
      const errors = validatePhoto(body.photo ?? null);
      if (errors.length) return fail(400, ...errors);
      return repo.setPhoto(params[0], body.photo ?? null) ? ok({ ok: true }) : fail(404, 'Patient not found');
    }

    // ---- Documents (files travel as base64 in JSON and are stored as BLOBs)
    if ((params = route('GET', /^\/api\/patients\/(\d+)\/documents$/))) return ok(repo.documents(params[0]));
    if ((params = route('POST', /^\/api\/patients\/(\d+)\/documents$/))) {
      if (!repo.patient(params[0])) return fail(404, 'Patient not found');
      const errors = validateDocument(body);
      if (errors.length) return fail(400, ...errors);
      const data = fromBase64(body.dataBase64);
      if (data.length === 0) return fail(400, 'The file is empty');
      const id = repo.addDocument({ ...body, patientId: params[0], fileName: body.fileName.slice(0, 200), data });
      return ok(repo.documents(params[0]).find((d) => d.id === id), 201);
    }
    if ((params = route('GET', /^\/api\/documents\/(\d+)$/))) {
      const doc = repo.document(params[0]);
      if (!doc) return fail(404, 'Document not found');
      const { data, ...meta } = doc;
      return ok({ ...meta, dataBase64: toBase64(data) });
    }
    if ((params = route('DELETE', /^\/api\/documents\/(\d+)$/))) {
      return repo.deleteDocument(params[0]) ? ok({ ok: true }) : fail(404, 'Document not found');
    }

    // ---- Appointments
    if (route('GET', /^\/api\/appointments$/)) {
      const from = query.from ?? query.date ?? today;
      return ok(repo.appointments({ from, to: query.to ?? from, providerId: query.providerId ? Number(query.providerId) : null }));
    }
    if (route('GET', /^\/api\/appointments\/counts$/)) {
      return ok(repo.dailyCounts({ from: query.from, to: query.to, providerId: query.providerId ? Number(query.providerId) : null }));
    }
    if ((params = route('GET', /^\/api\/appointments\/(\d+)$/))) {
      const appointment = repo.appointment(params[0]);
      return appointment ? ok(appointment) : fail(404, 'Appointment not found');
    }
    if (route('POST', /^\/api\/appointments$/)) {
      const errors = validateAppointment(body);
      if (errors.length) return fail(400, ...errors);
      const problems = repo.bookingProblems(body, now);
      if (problems.length) return fail(409, ...problems);
      const id = repo.createAppointment(body);
      return ok(repo.appointment(id), 201);
    }
    if ((params = route('PATCH', /^\/api\/appointments\/(\d+)\/status$/))) {
      if (!isValidStatus(body.status)) return fail(400, 'Unknown status');
      const current = repo.appointment(params[0]);
      if (current?.status === 'cancelled' && body.status !== 'cancelled') {
        // un-cancelling puts the visit back on the calendar, so the time must still be free
        const problems = repo.bookingProblems({ ...current, ignoreId: current.id });
        if (problems.length) return fail(409, ...problems);
      }
      return repo.updateStatus(params[0], body.status) ? ok({ ok: true }) : fail(404, 'Appointment not found');
    }

    // ---- Reports
    if (route('GET', /^\/api\/reports\/workload$/)) return ok(repo.providerWorkload({ from: query.from, to: query.to }));

    return fail(404, 'Not found');
  } catch (err) {
    return fail(409, friendly(err));       // constraint failures: double-booking, unknown ids, bad values
  }
}
