// Restricted records for the third staff password: the Bat-family's real charts.
import { api } from './api.js';
import { esc, usDate } from './ui.js';

const CLEARANCE = {
  against_advice: ['Field duty against medical advice', 'warn'],
  restricted: ['Restricted', 'hold'],
  cleared: ['Cleared for field work', 'ok'],
};

export async function renderBatcave(main) {
  const records = await api('/api/batfamily');
  main.innerHTML = `
    <div class="page-head batcave-head">
      <h1>Bat-Family Records</h1>
      <p class="muted">Restricted. ${records.length} charts · Attending: Dr. Leslie Thompkins</p>
    </div>
    <div class="bat-filters" role="group" aria-label="Filter by clearance">
      <button class="chip-btn" aria-pressed="true" data-filter="">All</button>
      ${Object.entries(CLEARANCE).map(([key, [label]]) => `<button class="chip-btn" aria-pressed="false" data-filter="${key}">${label}</button>`).join('')}
    </div>
    <div class="bat-grid">${records.map((r) => {
      const [label, tone] = CLEARANCE[r.clearance];
      return `<article class="bat-card" data-clearance="${r.clearance}">
        <header>
          <div><h2>${esc(r.realName)}</h2><p class="alias">${esc(r.alias)}</p></div>
          <span class="clearance ${tone}">${label}</span>
        </header>
        <dl class="detail-list">
          <dt>Age</dt><dd>${r.age} · ${esc(r.height)} · Blood type ${esc(r.bloodType)}</dd>
          <dt>Conditions</dt><dd>${esc(r.conditions)}</dd>
          <dt>Injuries</dt><dd>${esc(r.injuries)}</dd>
          <dt>Allergies</dt><dd>${esc(r.allergies)}</dd>
          <dt>Medications</dt><dd>${esc(r.medications)}</dd>
          <dt>Emergency</dt><dd>${esc(r.emergencyContact)}</dd>
          <dt>Last visit</dt><dd>${usDate(r.lastVisit)} <span class="muted">(${r.daysSinceVisit} days ago)</span></dd>
        </dl>
        ${r.notes ? `<p class="bat-note">${esc(r.notes)}</p>` : ''}
      </article>`;
    }).join('')}</div>
    <p class="muted bat-foot">Fictional records written for fun. Characters belong to DC Comics; this demo is not affiliated with DC.</p>`;
  main.querySelector('.bat-filters').onclick = (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    main.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    main.querySelectorAll('.bat-card').forEach((card) => { card.hidden = Boolean(b.dataset.filter) && card.dataset.clearance !== b.dataset.filter; });
  };
}
