// New patient / edit patient form: demographics, contact, emergency contact, care team,
// primary and secondary insurance, and a photo (resized in the browser before upload).
import { api } from './api.js';
import { $, esc, avatar, toast, today } from './ui.js';
import { loadProviders } from './schedule-view.js';

const PAYERS = ['Gotham Mutual Health', 'Wayne Enterprises Employee Health', 'Keystone Health Partners', 'Metropolis Care Alliance', 'Coast City Health Cooperative', 'Medicare', 'Medicaid'];
const STATES = ['NJ', 'NY', 'PA', 'CT', 'DE', 'MD', 'DC', 'CA', 'MO', 'MI', 'ME', 'FL', 'TX', 'IL', 'MA', 'Other'];
const LANGUAGES = ['English', 'Spanish', 'Chinese', 'Haitian Creole', 'Arabic', 'Vietnamese', 'Portuguese', 'French', 'Russian', 'Other'];

/** Draws the chosen image into a 320×320 square (center crop) and returns a small JPEG data URL. */
export function resizePhoto(file, size = 320) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file (JPEG, PNG or WebP).'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('That image is over 15 MB. Please choose a smaller one.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    img.src = url;
  });
}

const input = (name, label, value, attrs = '') =>
  `<label class="field">${label}<input name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;
const select = (name, label, options, value, attrs = '') =>
  `<label class="field">${label}<select name="${name}" ${attrs}>${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;

function insuranceFields(coverage, plan = {}) {
  const p = (f) => `${coverage}_${f}`;
  return `<fieldset class="card insurance-card"><legend><strong>${coverage === 'primary' ? 'Primary' : 'Secondary'} insurance</strong></legend>
    <div class="row">
      <label class="field">Payer<input name="${p('payer')}" list="payerList" value="${esc(plan.payer ?? '')}" placeholder="${coverage === 'primary' ? 'Leave blank for self-pay' : 'Optional'}"></label>
      ${input(p('plan_name'), 'Plan', plan.plan_name)}
    </div>
    <div class="row">
      ${input(p('member_id'), 'Member ID', plan.member_id)}
      ${input(p('group_number'), 'Group number', plan.group_number)}
      ${input(p('copay'), 'Copay ($)', plan.copay, 'type="number" min="0" step="1"')}
    </div>
    <div class="row">
      ${input(p('subscriber_name'), 'Subscriber name', plan.subscriber_name, 'placeholder="If not the patient"')}
      ${select(p('subscriber_relation'), 'Relationship to patient', [['self', 'Self'], ['spouse', 'Spouse'], ['parent', 'Parent'], ['other', 'Other']], plan.subscriber_relation ?? 'self')}
    </div></fieldset>`;
}

export async function renderPatientForm(main, id = null) {
  const [providers, patient] = await Promise.all([loadProviders(), id ? api(`/api/patients/${id}`) : null]);
  const p = patient ?? { preferred_language: 'English', state: 'NJ', city: 'Gotham', insurance: [] };
  const plan = (c) => p.insurance.find((i) => i.coverage === c);
  let photo = p.photo ?? null;
  const primaryCare = providers.filter((x) => ['Family Medicine', 'Internal Medicine', 'Pediatrics', "Women's Health"].includes(x.specialty));

  main.innerHTML = `
    <p><a href="${id ? `#/patients/${id}` : '#/patients'}">← ${id ? 'Back to profile' : 'All patients'}</a></p>
    <div class="page-head"><h1>${id ? `Edit ${esc(p.first_name)} ${esc(p.last_name)}` : 'New patient'}</h1></div>
    <form id="patientForm" class="patient-form" novalidate>
      <datalist id="payerList">${PAYERS.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
      <section class="card photo-section">
        <div id="photoPreview">${avatar(`${p.first_name ?? 'New'} ${p.last_name ?? 'Patient'}`, photo, 'lg')}</div>
        <div>
          <h2>Photo</h2>
          <p class="muted">Helps staff confirm identity at check-in. JPEG, PNG or WebP; it is cropped to a square and resized.</p>
          <label class="btn">Upload photo<input type="file" id="photoFile" accept="image/jpeg,image/png,image/webp" capture="user" hidden></label>
          <button type="button" class="btn ghost danger" id="photoRemove" ${photo ? '' : 'hidden'}>Remove photo</button>
        </div>
      </section>
      <section class="card"><h2>Patient</h2>
        <div class="row">${input('first_name', 'First name *', p.first_name, 'required autocomplete="off"')}${input('last_name', 'Last name *', p.last_name, 'required autocomplete="off"')}${input('preferred_name', 'Preferred name', p.preferred_name)}</div>
        <div class="row">${input('birth_date', 'Date of birth *', p.birth_date, `type="date" required max="${today()}"`)}
          ${select('sex', 'Sex *', [['', 'Choose…'], ['F', 'Female'], ['M', 'Male'], ['X', 'X / another']], p.sex, 'required')}
          ${select('preferred_language', 'Preferred language', LANGUAGES.map((l) => [l, l]), p.preferred_language)}</div>
      </section>
      <section class="card"><h2>Contact</h2>
        <div class="row">${input('phone', 'Phone', p.phone, 'type="tel" placeholder="555-0123"')}${input('email', 'Email', p.email, 'type="email"')}</div>
        <div class="row">${input('address', 'Street address', p.address)}${input('city', 'City', p.city)}
          ${select('state', 'State', STATES.map((s) => [s, s]), p.state)}${input('zip', 'ZIP', p.zip, 'inputmode="numeric" maxlength="10"')}</div>
        <h3>Emergency contact</h3>
        <div class="row">${input('emergency_name', 'Name', p.emergency_name)}${input('emergency_relation', 'Relationship', p.emergency_relation)}${input('emergency_phone', 'Phone', p.emergency_phone, 'type="tel"')}</div>
      </section>
      <section class="card"><h2>Care</h2>
        ${select('primary_provider_id', 'Primary care provider', [['', 'None'], ...primaryCare.map((x) => [x.id, `${x.name}, ${x.credential} · ${x.specialty}`])], p.primary_provider_id)}
        <div class="row">
          <label class="field">Allergies<textarea name="allergies">${esc(p.allergies ?? '')}</textarea></label>
          <label class="field">Current medications<textarea name="medications">${esc(p.medications ?? '')}</textarea></label>
        </div>
        <label class="field">Notes<textarea name="notes">${esc(p.notes ?? '')}</textarea></label>
      </section>
      ${insuranceFields('primary', plan('primary'))}
      ${insuranceFields('secondary', plan('secondary'))}
      <p class="form-errors" id="patientErrors" role="alert"></p>
      <div class="form-actions"><a class="btn ghost" href="${id ? `#/patients/${id}` : '#/patients'}">Cancel</a><button class="btn primary">${id ? 'Save changes' : 'Create patient'}</button></div>
    </form>`;

  const form = $('#patientForm');
  const refreshPreview = () => {
    const name = `${form.first_name.value || 'New'} ${form.last_name.value || 'Patient'}`;
    $('#photoPreview').innerHTML = avatar(name, photo, 'lg');
    $('#photoRemove').hidden = !photo;
  };
  $('#photoFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { photo = await resizePhoto(file); refreshPreview(); } catch (err) { toast(err.message, { error: true }); }
    e.target.value = '';
  };
  $('#photoRemove').onclick = () => { photo = null; refreshPreview(); };
  form.first_name.oninput = form.last_name.oninput = () => { if (!photo) refreshPreview(); };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const body = {};
    for (const [k, v] of Object.entries(data)) if (!/^(primary|secondary)_(payer|plan_name|member_id|group_number|copay|subscriber_name|subscriber_relation)$/.test(k)) body[k] = typeof v === 'string' ? v.trim() : v;
    body.primary_provider_id = body.primary_provider_id ? Number(body.primary_provider_id) : null;
    body.insurance = ['primary', 'secondary'].map((coverage) => {
      const plan = { coverage };
      for (const f of ['payer', 'plan_name', 'member_id', 'group_number', 'copay', 'subscriber_name', 'subscriber_relation']) plan[f] = (data[`${coverage}_${f}`] ?? '').trim();
      plan.copay = plan.copay === '' ? null : Number(plan.copay);
      if (plan.payer && !plan.subscriber_name && plan.subscriber_relation === 'self') plan.subscriber_name = `${body.first_name} ${body.last_name}`;
      return plan;
    }).filter((plan) => plan.payer || id);           // on edit, an empty payer removes that plan
    try {
      const saved = id ? await api(`/api/patients/${id}`, { method: 'PUT', body }) : await api('/api/patients', { method: 'POST', body });
      if ((photo ?? null) !== (p.photo ?? null)) await api(`/api/patients/${saved.id}/photo`, { method: 'PUT', body: { photo } });
      toast(id ? 'Patient updated' : `Created ${saved.first_name} ${saved.last_name} (${saved.mrn})`);
      location.hash = `#/patients/${saved.id}`;
    } catch (err) {
      $('#patientErrors').textContent = err.message;
      $('#patientErrors').scrollIntoView({ block: 'center' });
    }
  };
}
