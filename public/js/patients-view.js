// Patients: search the patient list and view a patient's profile.
import { api } from './api.js';
import { $, esc, avatar, usDate, ageOn, clockTime, statusBadge, now } from './ui.js';
import { openBooking } from './booking.js';
import { openAppointment } from './appointment.js';
import { resizePhoto } from './patient-form.js';
import { toast } from './ui.js';

export async function renderPatientList(main, params) {
  main.innerHTML = `
    <div class="page-head"><h1>Patients</h1><a class="btn primary" href="#/patients/new">+ New patient</a></div>
    <div class="toolbar"><input type="search" id="patientSearch" placeholder="Search by name, MRN (GH-104200) or date of birth (YYYY-MM-DD)" value="${esc(params.q ?? '')}" style="flex:1;max-width:520px" aria-label="Search patients"></div>
    <ul class="patient-list" id="patientResults"></ul>`;
  let timer;
  const search = async () => {
    const q = $('#patientSearch').value.trim();
    const results = await api(`/api/patients?q=${encodeURIComponent(q)}&limit=60`);
    $('#patientResults').innerHTML = results.map((p) => `<li><a href="#/patients/${p.id}">
      ${avatar(p.name)}<span class="grow"><strong>${esc(p.name)}</strong><br><span class="meta">${esc(p.mrn)} · DOB ${usDate(p.birthDate)} (${ageOn(p.birthDate)}) · ${esc(p.payer ?? 'Self-pay')}</span></span>
      <span class="meta">${esc(p.phone ?? '')}</span></a></li>`).join('') || '<li class="empty">No patients found.</li>';
  };
  $('#patientSearch').oninput = () => { clearTimeout(timer); timer = setTimeout(search, 200); };
  await search();
}

export async function renderPatient(main, id) {
  const p = await api(`/api/patients/${id}`);
  const name = `${p.first_name} ${p.last_name}`;
  const upcoming = p.appointments.filter((a) => ['scheduled', 'checked_in'].includes(a.status) && a.startsAt >= now().slice(0, 10)).reverse();
  const past = p.appointments.filter((a) => !upcoming.includes(a));
  const visitRow = (a) => `<tr><td>${usDate(a.startsAt.slice(0, 10))} ${clockTime(a.startsAt.slice(11))}</td><td>${esc(a.provider)}</td>
    <td>${esc(a.visitType)}: ${esc(a.reason)}</td><td>${statusBadge(a.status)}</td><td><button class="btn ghost" data-appt="${a.id}">Open</button></td></tr>`;
  main.innerHTML = `
    <p><a href="#/patients">← All patients</a></p>
    <section class="card" style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
      <div class="photo-wrap">${avatar(name, p.photo, 'lg')}
        <label class="photo-change" title="${p.photo ? 'Change photo' : 'Add photo'}">${p.photo ? 'Change' : 'Add photo'}<input type="file" id="quickPhoto" accept="image/jpeg,image/png,image/webp" hidden></label></div>
      <div style="flex:1;min-width:220px">
        <h1>${esc(name)}</h1>
        <p class="muted">${esc(p.mrn)} · DOB ${usDate(p.birth_date)} (${ageOn(p.birth_date)} years) · ${{ F: 'Female', M: 'Male', X: 'X' }[p.sex]}</p>
        <p>Primary care: <strong>${esc(p.primary_provider ?? 'None')}</strong></p>
      </div>
      <div class="status-actions"><a class="btn" href="#/patients/${p.id}/edit">Edit profile</a><button class="btn primary" id="bookForPatient">+ Book appointment</button></div>
    </section>
    <div class="row" style="margin-top:14px;gap:14px">
      <section class="card"><h2>Contact</h2><dl class="detail-list">
        <dt>Phone</dt><dd>${esc(p.phone ?? '—')}</dd><dt>Email</dt><dd>${esc(p.email ?? '—')}</dd>
        <dt>Address</dt><dd>${esc([p.address, [p.city, p.state].filter(Boolean).join(', '), p.zip].filter(Boolean).join(' ') || '—')}</dd>
        <dt>Language</dt><dd>${esc(p.preferred_language)}</dd>
        <dt>Emergency</dt><dd>${esc(p.emergency_name ?? '—')}${p.emergency_relation ? ` (${esc(p.emergency_relation)})` : ''}${p.emergency_phone ? `<br>${esc(p.emergency_phone)}` : ''}</dd></dl></section>
      <section class="card"><h2>Insurance</h2>${p.insurance.map((i) => `<dl class="detail-list">
        <dt>${i.coverage === 'primary' ? 'Primary' : 'Secondary'}</dt><dd><strong>${esc(i.payer)}</strong> ${esc(i.plan_name ?? '')}</dd>
        <dt>Member ID</dt><dd>${esc(i.member_id)}</dd><dt>Group</dt><dd>${esc(i.group_number ?? '—')}</dd>
        <dt>Subscriber</dt><dd>${esc(i.subscriber_name ?? name)} (${esc(i.subscriber_relation)})</dd><dt>Copay</dt><dd>${i.copay != null ? `$${i.copay}` : '—'}</dd></dl>`).join('') || '<p class="muted">Self-pay (no insurance on file)</p>'}</section>
      <section class="card"><h2>Clinical</h2><dl class="detail-list">
        <dt>Allergies</dt><dd>${esc(p.allergies ?? 'None recorded')}</dd><dt>Medications</dt><dd>${esc(p.medications ?? 'None recorded')}</dd>
        <dt>Notes</dt><dd>${esc(p.notes ?? '—')}</dd></dl></section>
    </div>
    <section class="card" style="margin-top:14px"><h2>Upcoming visits</h2>
      ${upcoming.length ? `<div class="table-wrap"><table class="data-table"><tbody>${upcoming.map(visitRow).join('')}</tbody></table></div>` : '<p class="muted">None scheduled.</p>'}</section>
    <section class="card" style="margin-top:14px"><h2>Visit history</h2>
      ${past.length ? `<div class="table-wrap"><table class="data-table"><tbody>${past.map(visitRow).join('')}</tbody></table></div>` : '<p class="muted">No past visits.</p>'}</section>`;
  const refresh = () => renderPatient(main, id);
  $('#bookForPatient').onclick = () => openBooking({ patientId: p.id, patientName: name, providerId: p.primary_provider_id }, refresh);
  main.querySelectorAll('[data-appt]').forEach((b) => { b.onclick = () => openAppointment(Number(b.dataset.appt), refresh); });
  $('#quickPhoto').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await api(`/api/patients/${p.id}/photo`, { method: 'PUT', body: { photo: await resizePhoto(file) } });
      toast('Photo updated');
      refresh();
    } catch (err) { toast(err.message, { error: true }); }
  };
}
