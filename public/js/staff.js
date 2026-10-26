// Staff sign-in. It's the first screen: nothing else loads until someone signs in as "Gotham Staff".
// The password picks the role, and the role decides which tabs and buttons appear (the API checks it too).
import { api, ApiError, isLocal } from './api.js';
import { $, esc, toast } from './ui.js';
import { PERMISSIONS } from '../src/seed/staff.js';

let current = null;                         // { id, username, name, role } while signed in
const listeners = new Set();

export const staff = () => current;
export const onStaffChange = (fn) => listeners.add(fn);
/** Whether the signed-in role may do something, e.g. can('schedule:write'). */
export const can = (permission) => Boolean(current && PERMISSIONS[current.role]?.includes(permission));

function set(next) {
  current = next;
  document.body.classList.toggle('signed-out', !current);
  document.body.dataset.role = current?.role ?? '';
  $('#staffBadge').hidden = !current;
  $('#staffBadge').innerHTML = current
    ? `<span class="staff-name">${esc(current.name)}</span><button type="button" class="link-btn" id="staffLogout">Log out</button>`
    : '';
  if (current) $('#staffLogout').onclick = signOut;
  else if (!$('#staffPass').value) setTimeout(() => $('#staffPass').focus(), 0);   // don't wipe what someone is typing
  listeners.forEach((fn) => fn(current));
}

async function signIn(e) {
  e.preventDefault();
  const button = $('#staffSubmit');
  button.disabled = true;
  button.textContent = 'Signing in…';
  try {
    const { staff: who } = await api('/api/login', { method: 'POST', body: { username: $('#staffUser').value, password: $('#staffPass').value } });
    $('#staffPass').value = '';
    $('#staffErrors').textContent = '';
    set(who);
    toast(`Signed in: ${who.name}`);
  } catch (err) {
    $('#staffErrors').textContent = err instanceof ApiError ? err.errors.join(' ') : err.message;
    $('#staffPass').select();
  } finally {
    button.disabled = false;
    button.textContent = 'Sign in';
  }
}

async function signOut() {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  location.hash = '';
  $('#staffPass').value = '';
  set(null);
  toast('Signed out');
}

/** Restores an existing session (cookie on the server, browser storage in the demo). */
export async function initStaff() {
  $('#staffForm').addEventListener('submit', signIn);
  if (isLocal) {
    $('#signinHint').hidden = false;
    $('#signinHint').innerHTML = 'Demo passwords: <code>customerservice</code> for scheduling, <code>medicalstaff</code> for patient information.';
  }
  try { set((await api('/api/me')).staff); } catch { set(null); }
}
