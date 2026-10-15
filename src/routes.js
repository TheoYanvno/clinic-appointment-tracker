// REST API routes as one plain function: (request) → { status, body }.
// The Node server calls it for real HTTP requests, and the live demo calls it directly in the browser,
// so both use the same validation, status codes and SQL.
import { validateAppointment, isValidStatus } from './validation.js';
import { toDateString, nowString } from './schedule.js';

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

export function handle(repo, { method = 'GET', path, query = {}, body = {}, today = toDateString(new Date()), now = nowString() }) {
  const route = (verb, pattern) => {
    if (method !== verb) return null;
    const match = path.match(pattern);
    return match ? match.slice(1).map(Number) : null;
  };
  let params;
  try {
    // ---- Clinic and providers
    if (route('GET', /^\/api\/clinic$/)) return ok({ hours: repo.clinicHours(), summary: repo.summary(today), today, now });
    if (route('GET', /^\/api\/providers$/)) return ok(repo.providers({ credential: query.credential || null, q: query.q || null }));
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
      const id = repo.createPatient(body);
      return ok(repo.patient(id), 201);
    }
    if ((params = route('PUT', /^\/api\/patients\/(\d+)$/))) {
      if (!repo.patient(params[0])) return fail(404, 'Patient not found');
      repo.updatePatient(params[0], body);
      return ok(repo.patient(params[0]));
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
      const id = repo.createAppointment(body);
      return ok(repo.appointment(id), 201);
    }
    if ((params = route('PATCH', /^\/api\/appointments\/(\d+)\/status$/))) {
      if (!isValidStatus(body.status)) return fail(400, 'Unknown status');
      return repo.updateStatus(params[0], body.status) ? ok({ ok: true }) : fail(404, 'Appointment not found');
    }

    // ---- Reports
    if (route('GET', /^\/api\/reports\/workload$/)) return ok(repo.providerWorkload({ from: query.from, to: query.to }));

    return fail(404, 'Not found');
  } catch (err) {
    return fail(409, friendly(err));       // constraint failures: double-booking, unknown ids, bad values
  }
}
