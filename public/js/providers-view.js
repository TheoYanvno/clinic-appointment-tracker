// Providers: all 36 clinicians with credential filter, search and weekly hours.
import { $, $$, esc, avatar, credentialBadge, clockTime, shortHour, today } from './ui.js';
import { loadProviders } from './schedule-view.js';

const CREDENTIALS = { all: 'All', MD: 'MD', DO: 'DO', NP: 'Nurse practitioners', PA: 'Physician assistants' };

export async function renderProviders(main, params) {
  const providers = await loadProviders();
  const credential = CREDENTIALS[params.credential] ? params.credential : 'all';
  main.innerHTML = `
    <div class="page-head"><h1>Providers</h1>
      <span class="muted">${providers.filter((p) => ['MD', 'DO'].includes(p.credential)).length} physicians ·
      ${providers.filter((p) => p.credential === 'NP').length} nurse practitioners · ${providers.filter((p) => p.credential === 'PA').length} physician assistants</span></div>
    <div class="toolbar filters">
      <div class="segmented" role="group" aria-label="Credential">${Object.entries(CREDENTIALS).map(([k, v]) => `<button data-cred="${k}" aria-pressed="${k === credential}">${v}</button>`).join('')}</div>
      <input type="search" id="providerSearch" placeholder="Search name or specialty" value="${esc(params.q ?? '')}" aria-label="Search providers">
    </div>
    <div class="provider-grid" id="providerGrid"></div>`;

  const draw = () => {
    const q = $('#providerSearch').value.trim().toLowerCase();
    const list = providers.filter((p) => (credential === 'all' || p.credential === credential)
      && (!q || `${p.name} ${p.specialty}`.toLowerCase().includes(q)));
    $('#providerGrid').innerHTML = list.map((p) => `
      <article class="card provider-card">
        <div class="who">${avatar(p.name)}<div><h3>${esc(p.name)}, ${p.credential}</h3><span class="muted">${esc(p.specialty)} · Room ${esc(p.room)}</span></div></div>
        <div>${credentialBadge(p.credential)} ${p.acceptingNew ? '<span class="badge">Accepting new patients</span>' : ''}</div>
        <div class="week-hours" aria-label="Weekly hours">${[1, 2, 3, 4, 5].map((d) => {
          const h = p.hours.find((x) => x.weekday === d);
          return h ? `<div title="${clockTime(h.starts)}–${clockTime(h.ends)}"><strong>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d - 1]}</strong><br>${shortHour(h.starts)}–${shortHour(h.ends)}</div>`
            : `<div class="off"><strong>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d - 1]}</strong><br>Off</div>`;
        }).join('')}</div>
        <div><a class="btn" href="#/schedule?view=day&date=${today()}&provider=${p.id}">Day</a>
          <a class="btn" href="#/schedule?view=week&date=${today()}&provider=${p.id}">Week</a>
          <a class="btn" href="#/schedule?view=month&date=${today()}&provider=${p.id}">Month</a></div>
      </article>`).join('') || '<p class="empty">No providers match.</p>';
  };
  draw();
  $('#providerSearch').oninput = draw;
  $$('[data-cred]').forEach((b) => { b.onclick = () => { location.hash = `#/providers?credential=${b.dataset.cred}`; }; });
}
