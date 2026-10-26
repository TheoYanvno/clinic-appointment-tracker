// Schedule: day, week and month views, for one provider or all providers.
// The view, date and provider live in the URL (#/schedule?view=week&date=…&provider=…) so every view can be linked.
import { api } from './api.js';
import { $, $$, esc, today, now, dayName, monthName, longDate, shortDate, clockTime, credentialBadge, STATUS_LABELS } from './ui.js';
import { weekOf, monthGrid, addDays, weekdayOf, toMinutes, toTime } from '../src/schedule.js';
import { openBooking } from './booking.js';
import { can } from './staff.js';
import { openAppointment } from './appointment.js';

const OPEN = toMinutes('08:00');
const CLOSE = toMinutes('17:00');
const SLOTS = (CLOSE - OPEN) / 15;                     // 36 quarter-hours in a business day
const isWeekend = (date) => [0, 6].includes(weekdayOf(date));

let providerCache;
export const loadProviders = async () => (providerCache ??= await api('/api/providers'));
export const forgetProviders = () => { providerCache = undefined; };

const go = (state) => { location.hash = `#/schedule?${new URLSearchParams(state)}`; };

/** Next or previous weekday (the clinic is closed on weekends). */
function stepDay(date, step) {
  let d = addDays(date, step);
  while (isWeekend(d)) d = addDays(d, step);
  return d;
}

export async function renderSchedule(main, params) {
  const providers = await loadProviders();
  const state = {
    view: ['day', 'week', 'month'].includes(params.view) ? params.view : 'day',
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '') ? params.date : today(),
    provider: params.provider && providers.some((p) => String(p.id) === params.provider) ? params.provider : 'all',
  };
  const provider = providers.find((p) => String(p.id) === state.provider);

  const label = state.view === 'day' ? longDate(state.date)
    : state.view === 'week' ? `Week of ${shortDate(weekOf(state.date)[0])} – ${shortDate(weekOf(state.date)[4])}, ${state.date.slice(0, 4)}`
    : monthName(state.date);
  const groups = ['MD', 'DO', 'NP', 'PA'].map((c) => `<optgroup label="${{ MD: 'Physicians (MD)', DO: 'Physicians (DO)', NP: 'Nurse practitioners', PA: 'Physician assistants' }[c]}">
    ${providers.filter((p) => p.credential === c).map((p) => `<option value="${p.id}" ${String(p.id) === state.provider ? 'selected' : ''}>${esc(p.name)}, ${p.credential} · ${esc(p.specialty)}</option>`).join('')}
  </optgroup>`).join('');

  main.innerHTML = `
    <div class="page-head">
      <h1>Schedule</h1>
      <button class="cs-only btn primary" id="newAppt">+ Book appointment</button>
    </div>
    <div class="toolbar">
      <label class="visually-hidden" for="providerPick">Provider</label>
      <select id="providerPick" aria-label="Provider"><option value="all">All providers (${providers.length})</option>${groups}</select>
      <div class="segmented" role="group" aria-label="View">
        ${['day', 'week', 'month'].map((v) => `<button data-view="${v}" aria-pressed="${v === state.view}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
      </div>
      <div class="segmented" role="group" aria-label="Change date">
        <button id="prev" aria-label="Previous">‹</button><button id="todayBtn">Today</button><button id="next" aria-label="Next">›</button>
      </div>
      <input type="date" id="jump" value="${state.date}" aria-label="Go to date">
      <span class="date-label">${label}</span>
      <span class="spacer"></span>
      <div class="legend">${Object.entries(STATUS_LABELS).map(([k, v]) => `<span style="--c:var(--${k})">${v}</span>`).join('')}</div>
    </div>
    ${provider ? `<p class="muted">${credentialBadge(provider.credential)} <strong>${esc(provider.name)}</strong> · ${esc(provider.specialty)} · Room ${esc(provider.room)}</p>` : ''}
    <div id="scheduleBody" class="card schedule-wrap"><p class="empty">Loading…</p></div>`;

  $('#providerPick').onchange = (e) => go({ ...state, provider: e.target.value });
  $$('[data-view]').forEach((b) => { b.onclick = () => go({ ...state, view: b.dataset.view }); });
  $('#todayBtn').onclick = () => go({ ...state, date: today() });
  $('#jump').onchange = (e) => e.target.value && go({ ...state, date: e.target.value });
  const step = (dir) => {
    if (state.view === 'day') return stepDay(state.date, dir);
    if (state.view === 'week') return addDays(state.date, 7 * dir);
    const [y, m] = state.date.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + dir, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  };
  $('#prev').onclick = () => go({ ...state, date: step(-1) });
  $('#next').onclick = () => go({ ...state, date: step(1) });

  const refresh = () => renderSchedule(main, state);
  $('#newAppt').onclick = () => openBooking({ providerId: provider?.id, date: isWeekend(state.date) ? stepDay(state.date, 1) : state.date }, refresh);

  const body = $('#scheduleBody');
  if (state.view === 'month') return renderMonth(body, state, provider);
  if (state.view === 'week') return provider ? renderProviderGrid(body, weekOf(state.date), provider, refresh) : renderWeekSummary(body, state, providers);
  if (isWeekend(state.date)) {
    body.innerHTML = `<p class="empty">The clinic is closed on weekends. Business hours are Monday–Friday, 8:00 AM – 5:00 PM.
      <br><br><button class="btn" id="nextOpen">Go to ${longDate(stepDay(state.date, 1))}</button></p>`;
    $('#nextOpen').onclick = () => go({ ...state, date: stepDay(state.date, 1) });
    return;
  }
  return provider ? renderProviderGrid(body, [state.date], provider, refresh) : renderAllProvidersDay(body, state, providers, refresh);
}

// ---------- One provider: time grid with one column per day ----------
async function renderProviderGrid(body, dates, provider, refresh) {
  const appts = await api(`/api/appointments?from=${dates[0]}&to=${dates.at(-1)}&providerId=${provider.id}`);
  const rowOf = (time) => 2 + (toMinutes(time) - OPEN) / 15;          // row 1 is the header
  let html = '<div class="corner col-head"></div>';
  dates.forEach((date, c) => {
    const count = appts.filter((a) => a.startsAt.startsWith(date) && a.status !== 'cancelled').length;
    html += `<div class="col-head ${date === today() ? 'today' : ''}" style="grid-column:${c + 2};grid-row:1">${dayName(date, dates.length > 1)} ${shortDate(date)} <span class="muted">· ${count} visit${count === 1 ? '' : 's'}</span></div>`;
  });
  for (let i = 0; i < SLOTS; i++) {
    const time = toTime(OPEN + i * 15);
    if (i % 4 === 0) html += `<div class="time" style="grid-row:${i + 2}">${clockTime(time)}</div>`;
    dates.forEach((date, c) => {
      const h = provider.hours.find((x) => x.weekday === weekdayOf(date));
      const t = OPEN + i * 15;
      const off = !h || t < toMinutes(h.starts) || t >= toMinutes(h.ends);
      const lunch = !off && h.lunchStarts && t >= toMinutes(h.lunchStarts) && t < toMinutes(h.lunchEnds);
      const label = off ? 'Not working' : lunch ? 'Lunch' : `Book ${clockTime(time)} on ${shortDate(date)}`;
      html += `<div class="cell ${i % 4 === 0 ? 'hour' : ''} ${off ? 'off' : ''} ${lunch ? 'lunch' : ''}" style="grid-column:${c + 2};grid-row:${i + 2}"
        ${off || lunch ? '' : `data-date="${date}" data-time="${time}" role="button" tabindex="-1"`} title="${label}"></div>`;
    });
  }
  for (const a of appts.filter((x) => x.status !== 'cancelled')) {
    const c = dates.indexOf(a.startsAt.slice(0, 10));
    const span = a.duration / 15;
    html += `<button class="appt ${a.status}" style="--c:var(--${a.status});grid-column:${c + 2};grid-row:${rowOf(a.startsAt.slice(11))} / span ${span}" data-appt="${a.id}"
      title="${esc(`${clockTime(a.startsAt.slice(11))} ${a.patient}: ${a.reason} (${STATUS_LABELS[a.status]})`)}">
      <strong>${clockTime(a.startsAt.slice(11))} ${esc(a.patient)}</strong>${span > 1 ? `${esc(a.visitType)} · ${esc(a.reason)}` : ''}</button>`;
  }
  const nowTime = now().slice(11);
  if (dates.includes(today()) && toMinutes(nowTime) >= OPEN && toMinutes(nowTime) < CLOSE) {
    html += `<div class="now-line" style="grid-row:${rowOf(nowTime.slice(0, 3) + String(Math.floor(Number(nowTime.slice(3)) / 15) * 15).padStart(2, '0'))};margin-top:${(Number(nowTime.slice(3)) % 15) / 15 * 18}px" aria-hidden="true"></div>`;
  }
  const cancelled = appts.filter((a) => a.status === 'cancelled');
  body.innerHTML = `<div class="timegrid" style="--cols:${dates.length};grid-template-rows:auto repeat(${SLOTS}, var(--slot))">${html}</div>
    ${cancelled.length ? `<p class="muted" style="margin:10px 0 0">Cancelled: ${cancelled.map((a) => `<button class="btn ghost" data-appt="${a.id}" style="padding:2px 6px">${shortDate(a.startsAt.slice(0, 10))} ${clockTime(a.startsAt.slice(11))} ${esc(a.patient)}</button>`).join(' ')}</p>` : ''}`;
  wire(body, provider.id, refresh);
  body.querySelector('.col-head.today')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- All providers, one day: provider rows × quarter-hour columns ----------
async function renderAllProvidersDay(body, state, providers, refresh) {
  const appts = await api(`/api/appointments?date=${state.date}`);
  const weekday = weekdayOf(state.date);
  let html = '<div class="g-head g-name">Provider</div>';
  for (let i = 0; i < SLOTS; i += 4) html += `<div class="g-head" style="grid-column:${i + 2} / span 4">${clockTime(toTime(OPEN + i * 15)).replace(':00', '')}</div>`;
  providers.forEach((p, r) => {
    const row = r + 2;
    const h = p.hours.find((x) => x.weekday === weekday);
    const count = appts.filter((a) => a.providerId === p.id && a.status !== 'cancelled').length;
    html += `<div class="g-name" style="grid-row:${row}">${credentialBadge(p.credential)}
      <a href="#/schedule?view=day&date=${state.date}&provider=${p.id}" title="${esc(p.specialty)}">${esc(p.name)}</a><span class="muted">${h ? count : 'off'}</span></div>`;
    for (let i = 0; i < SLOTS; i++) {
      const t = OPEN + i * 15;
      const off = !h || t < toMinutes(h.starts) || t >= toMinutes(h.ends);
      const lunch = !off && h.lunchStarts && t >= toMinutes(h.lunchStarts) && t < toMinutes(h.lunchEnds);
      html += `<div class="g-cell ${off ? 'off' : ''} ${lunch ? 'lunch' : ''}" style="grid-row:${row};grid-column:${i + 2}"
        ${off || lunch ? '' : `data-date="${state.date}" data-time="${toTime(t)}" data-provider="${p.id}"`}></div>`;
    }
  });
  const rowOf = Object.fromEntries(providers.map((p, r) => [p.id, r + 2]));
  for (const a of appts.filter((x) => x.status !== 'cancelled')) {
    const col = 2 + (toMinutes(a.startsAt.slice(11)) - OPEN) / 15;
    html += `<button class="appt ${a.status}" style="--c:var(--${a.status});grid-row:${rowOf[a.providerId]};grid-column:${col} / span ${a.duration / 15}" data-appt="${a.id}"
      title="${esc(`${clockTime(a.startsAt.slice(11))} ${a.patient}: ${a.reason} (${STATUS_LABELS[a.status]})`)}"><strong>${esc(a.patient.split(' ').at(-1))}</strong></button>`;
  }
  const total = appts.filter((a) => a.status !== 'cancelled').length;
  body.innerHTML = `<p class="muted" style="margin:0 0 8px">${total} appointments across ${providers.filter((p) => p.hours.some((x) => x.weekday === weekday)).length} providers working today. Click a name for that provider's day, or an open space to book.</p>
    <div class="gantt">${html}</div>`;
  wire(body, null, refresh);
}

// ---------- All providers, one week: visits and how full each day is ----------
async function renderWeekSummary(body, state, providers) {
  const days = weekOf(state.date);
  const appts = await api(`/api/appointments?from=${days[0]}&to=${days[4]}`);
  const booked = {};
  for (const a of appts) if (a.status !== 'cancelled') {
    const key = `${a.providerId}|${a.startsAt.slice(0, 10)}`;
    booked[key] = booked[key] ?? { n: 0, minutes: 0 };
    booked[key].n++;
    booked[key].minutes += a.duration;
  }
  const rows = providers.map((p) => `<tr>
    <th scope="row">${credentialBadge(p.credential)} <a href="#/schedule?view=week&date=${state.date}&provider=${p.id}">${esc(p.name)}</a><br><span class="muted">${esc(p.specialty)}</span></th>
    ${days.map((d) => {
      const h = p.hours.find((x) => x.weekday === weekdayOf(d));
      if (!h) return '<td class="closed">Off</td>';
      const available = toMinutes(h.ends) - toMinutes(h.starts) - (h.lunchStarts ? toMinutes(h.lunchEnds) - toMinutes(h.lunchStarts) : 0);
      const b = booked[`${p.id}|${d}`] ?? { n: 0, minutes: 0 };
      const pct = Math.round((100 * b.minutes) / available);
      return `<td class="day"><button data-go="${d}|${p.id}" title="${pct}% booked">${b.n} visit${b.n === 1 ? '' : 's'} <span class="muted">· ${pct}%</span><div class="meter"><i style="width:${Math.min(pct, 100)}%"></i></div></button></td>`;
    }).join('')}</tr>`).join('');
  body.innerHTML = `<table class="week-table"><thead><tr><th>Provider</th>${days.map((d) => `<th ${d === today() ? 'style="color:var(--scheduled)"' : ''}>${dayName(d, true)} ${shortDate(d)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-go]', body).forEach((b) => { b.onclick = () => { const [date, provider] = b.dataset.go.split('|'); go({ view: 'day', date, provider }); }; });
}

// ---------- Month calendar ----------
async function renderMonth(body, state, provider) {
  const grid = monthGrid(state.date);
  const counts = await api(`/api/appointments/counts?from=${grid[0]}&to=${grid.at(-1)}${provider ? `&providerId=${provider.id}` : ''}`);
  const byDate = Object.fromEntries(counts.map((c) => [c.date, c]));
  const month = state.date.slice(0, 7);
  body.innerHTML = `<div class="month">
    ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="dow">${d}</div>`).join('')}
    ${grid.map((d) => {
      const c = byDate[d];
      const cls = `day ${d.slice(0, 7) !== month ? 'other' : ''} ${isWeekend(d) ? 'weekend' : ''} ${d === today() ? 'today' : ''}`;
      if (isWeekend(d)) return `<div class="${cls}"><span class="num">${Number(d.slice(8))}</span><span class="sub">Closed</span></div>`;
      const works = !provider || provider.hours.some((h) => h.weekday === weekdayOf(d));
      const detail = !c ? (works ? 'No visits' : 'Not working')
        : d < today() ? `${c.completed} completed · ${c.noShows} no-show${c.noShows === 1 ? '' : 's'}` : `${c.scheduled} scheduled`;
      return `<button class="${cls}" data-day="${d}" aria-label="${longDate(d)}: ${c?.total ?? 0} visits">
        <span class="num">${Number(d.slice(8))}</span><span class="count">${c?.total ?? (works ? 0 : '–')}</span><span class="sub">${detail}</span></button>`;
    }).join('')}</div>`;
  $$('[data-day]', body).forEach((b) => { b.onclick = () => go({ ...state, view: 'day', date: b.dataset.day }); });
}

/** Clicking an appointment opens it; clicking open time starts a booking there. */
function wire(body, providerId, refresh) {
  body.onclick = (e) => {
    const appt = e.target.closest('[data-appt]');
    if (appt) return openAppointment(Number(appt.dataset.appt), refresh);
    const cell = e.target.closest('[data-time]');
    if (cell && can('schedule:write')) openBooking({ providerId: Number(cell.dataset.provider ?? providerId), date: cell.dataset.date, time: cell.dataset.time }, refresh);
  };
}
