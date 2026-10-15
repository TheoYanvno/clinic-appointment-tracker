// Hash router: #/schedule, #/patients, #/patients/12, #/providers, #/reports (with ?query for filters).
import { $, $$, now, longDate, clockTime, toast } from './ui.js';
import { renderSchedule } from './schedule-view.js';
import { renderPatientList, renderPatient } from './patients-view.js';
import { renderProviders } from './providers-view.js';
import { renderReports } from './reports-view.js';

const main = $('#view');

async function route() {
  const [path, query = ''] = (location.hash.slice(1) || '/schedule').split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  const [, section, id] = path.split('/');
  $$('.tabs a').forEach((a) => (a.dataset.tab === section ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  try {
    if (section === 'patients' && id) await renderPatient(main, Number(id));
    else if (section === 'patients') await renderPatientList(main, params);
    else if (section === 'providers') await renderProviders(main, params);
    else if (section === 'reports') await renderReports(main, params);
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

addEventListener('hashchange', () => { route(); main.focus({ preventScroll: true }); });
tick();
setInterval(tick, 30000);
route();
