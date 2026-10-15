// Reports: today's numbers and each provider's workload over a date range.
import { api } from './api.js';
import { $, esc, today, credentialBadge } from './ui.js';
import { addDays } from '../src/schedule.js';

export async function renderReports(main, params) {
  const to = params.to ?? today();
  const from = params.from ?? addDays(to, -13);
  const [clinic, workload] = await Promise.all([api('/api/clinic'), api(`/api/reports/workload?from=${from}&to=${to}`)]);
  const s = clinic.summary;
  const max = Math.max(...workload.map((w) => w.total), 1);
  main.innerHTML = `
    <div class="page-head"><h1>Reports</h1></div>
    <div class="stats">
      <div class="card stat"><div class="label">Visits today</div><div class="value">${s.today}</div></div>
      <div class="card stat"><div class="label">Checked in now</div><div class="value">${s.checkedIn}</div></div>
      <div class="card stat"><div class="label">Patients</div><div class="value">${s.patients.toLocaleString()}</div></div>
      <div class="card stat"><div class="label">Providers</div><div class="value">${s.providers}</div></div>
      <div class="card stat"><div class="label">No-show rate</div><div class="value">${s.noShowPct ?? 0}%</div></div>
    </div>
    <section class="card">
      <form class="toolbar" id="range">
        <h2 style="margin:0;flex:1">Provider workload</h2>
        <label>From <input type="date" name="from" value="${from}"></label>
        <label>To <input type="date" name="to" value="${to}"></label>
        <button class="btn">Update</button>
      </form>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Provider</th><th>Specialty</th><th class="num">Visits</th><th></th><th class="num">Completed</th><th class="num">No-shows</th><th class="num">No-show rate</th></tr></thead>
        <tbody>${workload.map((w) => `<tr>
          <td>${credentialBadge(w.provider.split(', ').at(-1))} <a href="#/schedule?view=week&date=${to}&provider=${w.id}">${esc(w.provider)}</a></td>
          <td>${esc(w.specialty)}</td><td class="num">${w.total}</td>
          <td><div class="bar"><i style="width:${(100 * w.total) / max}%"></i></div></td>
          <td class="num">${w.completed}</td><td class="num">${w.noShows}</td><td class="num">${w.noShowPct ?? '–'}${w.noShowPct != null ? '%' : ''}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>`;
  $('#range').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    location.hash = `#/reports?from=${f.get('from')}&to=${f.get('to')}`;
  };
}
