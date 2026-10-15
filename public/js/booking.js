// "Book an appointment" dialog: pick a patient, provider, date and one of the provider's open times.
import { api } from './api.js';
import { $, esc, today, usDate, clockTime, toast } from './ui.js';
import { loadProviders } from './schedule-view.js';

const dialog = () => $('#bookDialog');
let onBooked = () => {};
let chosenTime = null;

/** prefill: { patientId, patientName, providerId, date, time } */
export async function openBooking(prefill = {}, done = () => {}) {
  onBooked = done;
  const providers = await loadProviders();
  $('#bookProvider').innerHTML = providers.map((p) => `<option value="${p.id}">${esc(p.name)}, ${p.credential} · ${esc(p.specialty)}</option>`).join('');
  if (prefill.providerId) $('#bookProvider').value = prefill.providerId;
  $('#bookDate').value = prefill.date ?? today();
  $('#bookDate').min = today();
  $('#bookPatientId').value = prefill.patientId ?? '';
  $('#bookPatientSearch').value = prefill.patientName ?? '';
  $('#bookReason').value = '';
  $('#bookErrors').textContent = '';
  chosenTime = prefill.time ?? null;
  dialog().showModal();
  await loadSlots();
  (prefill.patientId ? $('#bookReason') : $('#bookPatientSearch')).focus();
}

async function loadSlots() {
  const box = $('#bookSlots');
  const date = $('#bookDate').value;
  if (!date) return;
  box.innerHTML = '<span class="muted">Loading open times…</span>';
  const slots = await api(`/api/providers/${$('#bookProvider').value}/slots?date=${date}&duration=${$('#bookDuration').value}`);
  if (chosenTime && !slots.includes(chosenTime)) chosenTime = null;
  box.innerHTML = slots.length
    ? slots.map((t) => `<button type="button" role="radio" aria-checked="${t === chosenTime}" data-time="${t}">${clockTime(t)}</button>`).join('')
    : '<span class="muted">No open times that day. Try another date or provider (the clinic is closed on weekends).</span>';
}

$('#bookSlots').addEventListener('click', (e) => {
  const b = e.target.closest('[data-time]');
  if (!b) return;
  chosenTime = b.dataset.time;
  $('#bookSlots').querySelectorAll('[role=radio]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
});
for (const id of ['#bookProvider', '#bookDate', '#bookDuration']) $(id).addEventListener('change', loadSlots);
$('#bookType').addEventListener('change', (e) => {
  if (e.target.value === 'New patient' && $('#bookDuration').value < 45) { $('#bookDuration').value = '45'; loadSlots(); }
});

// ---- Patient search (type at least 2 letters)
let searchTimer;
$('#bookPatientSearch').addEventListener('input', (e) => {
  $('#bookPatientId').value = '';
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  const list = $('#bookPatientResults');
  if (q.length < 2) { list.hidden = true; return; }
  searchTimer = setTimeout(async () => {
    const results = await api(`/api/patients?q=${encodeURIComponent(q)}&limit=8`);
    list.innerHTML = results.map((p) => `<li role="option" data-id="${p.id}" data-name="${esc(p.name)}">
      <span><strong>${esc(p.name)}</strong> <span class="muted">${esc(p.mrn)}</span></span><span class="muted">DOB ${usDate(p.birthDate)}</span></li>`).join('')
      || '<li class="muted">No patients found</li>';
    list.hidden = false;
    $('#bookPatientSearch').setAttribute('aria-expanded', 'true');
  }, 200);
});
$('#bookPatientResults').addEventListener('click', (e) => {
  const li = e.target.closest('[data-id]');
  if (!li) return;
  $('#bookPatientId').value = li.dataset.id;
  $('#bookPatientSearch').value = li.dataset.name;
  $('#bookPatientResults').hidden = true;
  $('#bookPatientSearch').setAttribute('aria-expanded', 'false');
  $('#bookReason').focus();
});

$('#bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const problems = [];
  if (!$('#bookPatientId').value) problems.push('Choose a patient from the search results');
  if (!chosenTime) problems.push('Choose one of the open times');
  if (problems.length) { $('#bookErrors').textContent = problems.join('\n'); return; }
  try {
    const appt = await api('/api/appointments', {
      method: 'POST',
      body: {
        patientId: Number($('#bookPatientId').value),
        providerId: Number($('#bookProvider').value),
        startsAt: `${$('#bookDate').value} ${chosenTime}`,
        duration: Number($('#bookDuration').value),
        visitType: $('#bookType').value,
        reason: $('#bookReason').value,
      },
    });
    dialog().close();
    toast(`Booked ${appt.patient} with ${appt.provider} on ${usDate(appt.startsAt.slice(0, 10))} at ${clockTime(appt.startsAt.slice(11))}`);
    onBooked(appt);
  } catch (err) {
    $('#bookErrors').textContent = err.message;
  }
});
