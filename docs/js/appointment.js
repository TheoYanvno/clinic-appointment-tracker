// Appointment details dialog with check-in / complete / no-show / cancel actions.
import { api } from './api.js';
import { $, esc, longDate, clockTime, statusBadge, toast, today } from './ui.js';

const ACTIONS = {
  scheduled: [['checked_in', 'Check in', 'primary'], ['no_show', 'Mark no-show', ''], ['cancelled', 'Cancel visit', 'danger']],
  checked_in: [['completed', 'Complete visit', 'primary'], ['scheduled', 'Undo check-in', '']],
  completed: [['checked_in', 'Reopen', '']],
  no_show: [['scheduled', 'Undo no-show', '']],
  cancelled: [['scheduled', 'Reinstate', '']],
};

export async function openAppointment(id, onChange = () => {}) {
  const a = await api(`/api/appointments/${id}`);
  const end = new Date(Date.UTC(2000, 0, 1, ...a.startsAt.slice(11).split(':').map(Number)) + a.duration * 60000).toISOString().slice(11, 16);
  $('#apptTitle').textContent = `${a.visitType}`;
  $('#apptBody').innerHTML = `
    <dl class="detail-list">
      <dt>Patient</dt><dd><a href="#/patients/${a.patientId}" data-close>${esc(a.patient)}</a> <span class="muted">${esc(a.mrn)}</span></dd>
      <dt>Provider</dt><dd>${esc(a.provider)} <span class="muted">· ${esc(a.specialty)}</span></dd>
      <dt>When</dt><dd>${longDate(a.startsAt.slice(0, 10))}<br>${clockTime(a.startsAt.slice(11))} – ${clockTime(end)} (${a.duration} min)</dd>
      <dt>Reason</dt><dd>${esc(a.reason)}</dd>
      <dt>Status</dt><dd>${statusBadge(a.status)}</dd>
    </dl>
    <div class="status-actions">
      ${(ACTIONS[a.status] ?? []).filter(([s]) => !(s === 'checked_in' && a.startsAt.slice(0, 10) > today()))
        .map(([status, label, style]) => `<button class="btn ${style}" data-status="${status}">${label}</button>`).join('')}
    </div>
    <p class="form-errors" id="apptErrors" role="alert"></p>`;
  $('#apptBody').querySelectorAll('[data-status]').forEach((b) => {
    b.onclick = async () => {
      try {
        await api(`/api/appointments/${id}/status`, { method: 'PATCH', body: { status: b.dataset.status } });
        $('#apptDialog').close();
        toast(`${a.patient}: ${b.textContent.toLowerCase()}`);
        onChange();
      } catch (err) {
        $('#apptErrors').textContent = err.message;
      }
    };
  });
  $('#apptDialog').showModal();
}
