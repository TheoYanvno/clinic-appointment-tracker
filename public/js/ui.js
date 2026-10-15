// Small UI helpers shared by every view.
import { toDateString, nowString, weekdayOf } from '../src/schedule.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Escapes text before putting it into HTML (prevents script injection from user-entered data). */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const today = () => toDateString(new Date());
export const now = () => nowString(new Date());

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayName = (date, short = false) => (short ? DAY_NAMES[weekdayOf(date)].slice(0, 3) : DAY_NAMES[weekdayOf(date)]);
export const monthName = (date) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
export const longDate = (date) => `${dayName(date)}, ${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8))}, ${date.slice(0, 4)}`;
export const shortDate = (date) => `${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)} ${Number(date.slice(8))}`;
export const usDate = (date) => (date ? `${date.slice(5, 7)}/${date.slice(8, 10)}/${date.slice(0, 4)}` : '');

/** '14:30' → '2:30 PM' */
export function clockTime(time) {
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** '08:00' → '8', '16:30' → '4:30' (compact, for weekly hour grids) */
export const shortHour = (time) => { const [h, m] = time.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}`; };

export function ageOn(birthDate, on = today()) {
  let age = Number(on.slice(0, 4)) - Number(birthDate.slice(0, 4));
  if (on.slice(5) < birthDate.slice(5)) age--;
  return age;
}

export const STATUS_LABELS = { scheduled: 'Scheduled', checked_in: 'Checked in', completed: 'Completed', no_show: 'No-show', cancelled: 'Cancelled' };
export const statusBadge = (status) => `<span class="status ${status}">${STATUS_LABELS[status]}</span>`;
export const credentialBadge = (credential) => `<span class="badge cred-${credential}">${credential}</span>`;

const initials = (name) => name.replace(/^Dr\.\s*/, '').split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const AVATAR_COLORS = ['#1c3150', '#2f6fd6', '#2e8b57', '#8a5300', '#6b3fa0', '#a3324f', '#1f7a7a'];
/** A photo if there is one, otherwise colored initials. */
export function avatar(name, photo, size = '') {
  if (photo) return `<img class="avatar ${size}" src="${esc(photo)}" alt="Photo of ${esc(name)}">`;
  const color = AVATAR_COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return `<span class="avatar ${size}" style="background:${color}" aria-hidden="true">${esc(initials(name))}</span>`;
}

let toastTimer;
export function toast(message, { error = false } = {}) {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast${error ? ' error' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

/** Close buttons inside dialogs. */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) e.target.closest('dialog')?.close();
});
