// Hash router: #/schedule, #/patients, #/patients/12, #/providers, #/reports (with ?query for filters).
import { $, $$, now, longDate, clockTime, toast } from './ui.js';
import { isLocal } from './api.js';
import { renderSchedule } from './schedule-view.js';
import { renderPatientList, renderPatient } from './patients-view.js';
import { renderPatientForm } from './patient-form.js';
import { renderProviders } from './providers-view.js';
import { renderReports } from './reports-view.js';
import { renderBatcave } from './batcave-view.js';
import { initStaff, staff, can, onStaffChange } from './staff.js';

const main = $('#view');

// Each tab and the permission it needs; the first one a role can use is its home page.
const SECTIONS = { schedule: 'schedule:read', patients: 'patients', providers: 'schedule:read', reports: 'reports', batcave: 'batfamily' };
const HOME = { customer_service: 'schedule', medical_staff: 'patients', bat_family: 'batcave' };

async function route() {
  if (!staff()) { main.innerHTML = ''; return; }                // the sign-in screen is showing
  $$('.tabs a').forEach((a) => { a.hidden = !can(SECTIONS[a.dataset.tab]); });
  const home = HOME[staff().role] ?? 'schedule';
  let [path, query = ''] = (location.hash.slice(1) || `/${home}`).split('?');
  let [, section, id, action] = path.split('/');
  if (!can(SECTIONS[section])) {                                 // not this role's page: go home instead
    history.replaceState(null, '', `#/${home}`);
    [path, query, section, id, action] = [`/${home}`, '', home, undefined, undefined];
  }
  const params = Object.fromEntries(new URLSearchParams(query));
  $$('.tabs a').forEach((a) => (a.dataset.tab === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  try {
    if (section === 'patients' && id === 'new') await renderPatientForm(main);
    else if (section === 'patients' && action === 'edit') await renderPatientForm(main, Number(id));
    else if (section === 'patients' && id) await renderPatient(main, Number(id));
    else if (section === 'patients') await renderPatientList(main, params);
    else if (section === 'providers') await renderProviders(main, params);
    else if (section === 'reports') await renderReports(main, params);
    else if (section === 'batcave') await renderBatcave(main);
    else await renderSchedule(main, params);
  } catch (err) {
    main.innerHTML = `<p class="empty">Something went wrong: ${err.message}</p>`;
    toast(err.message, { error: true });
  }
}

function tick() {
  const n = now();
  $('#clock').textContent = `${longDate(n.slice(0, 10))} · ${clockTime(n.slice(11))}`;
}

let lastSection = '';
if (isLocal) {
  $('#banner').innerHTML = `Live demo with fictional patients. Everything runs in your browser and changes are saved on this device only.
    Do not enter real health information. <button class="link-btn" id="resetDemo">Reset demo data</button>`;
  $('#resetDemo').onclick = async (e) => {
    if (e.target.dataset.confirm !== 'yes') { e.target.dataset.confirm = 'yes'; e.target.textContent = 'Click again to erase your changes'; return; }
    const { resetDemo } = await import('./local.js');
    resetDemo();
  };
}

addEventListener('hashchange', () => {
  const section = location.hash.split('?')[0];
  if (section !== lastSection) scrollTo(0, 0);       // new page: start at the top (but keep place when only filters change)
  lastSection = section;
  route();
  main.focus({ preventScroll: true });
});
tick();
setInterval(tick, 30000);
// Signing in or out swaps between the sign-in screen and that role's portal
onStaffChange(() => { scrollTo(0, 0); route(); });
await initStaff();
route();
