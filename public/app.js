// Front end: vanilla JavaScript with fetch + async/await.
const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors.join(', '));
  return data;
}

async function loadDay() {
  const appointments = await api(`/api/appointments?date=${$('day').value}`);
  $('rows').innerHTML = appointments.map((a) => `
    <tr>
      <td>${a.startsAt.slice(11)}</td><td>${a.patient}</td><td>${a.provider}</td><td>${a.reason}</td>
      <td>
        <select data-id="${a.id}">
          ${['scheduled', 'checked_in', 'completed', 'no_show', 'cancelled']
            .map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('') || '<tr><td colspan="5">No appointments</td></tr>';

  const active = appointments.filter((a) => a.status !== 'cancelled').length;
  $('summary').textContent = `${active} active appointment(s)`;
}

async function loadWorkload() {
  const rows = await api('/api/reports/workload');
  $('workload').innerHTML = rows
    .map((r) => `<li>${r.provider}: ${r.total} total, ${r.completed} completed, ${r.noShows} no-shows</li>`)
    .join('');
}

async function loadOptions() {
  const [patients, providers] = await Promise.all([api('/api/patients'), api('/api/providers')]);
  $('patient').innerHTML = patients.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
  $('provider').innerHTML = providers.map((p) => `<option value="${p.id}">${p.name} (${p.specialty})</option>`).join('');
}

$('day').addEventListener('change', loadDay);

$('rows').addEventListener('change', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  await api(`/api/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
  loadWorkload();
});

$('book').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: Number($('patient').value),
        providerId: Number($('provider').value),
        startsAt: $('startsAt').value.replace('T', ' '),
        reason: $('reason').value,
      }),
    });
    $('message').className = '';
    $('message').textContent = 'Appointment booked.';
    $('day').value = $('startsAt').value.slice(0, 10);
    await Promise.all([loadDay(), loadWorkload()]);
  } catch (err) {
    $('message').className = 'error';
    $('message').textContent = err.message;
  }
});

loadOptions().then(loadDay).then(loadWorkload);
