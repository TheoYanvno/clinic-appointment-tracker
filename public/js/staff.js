// Hidden staff sign-in. Nothing in the main navigation points to it: open it from the small
// "Staff" link in the footer or with Ctrl+Shift+L. Signed-in staff get the Reports tab and can delete documents.
import { api, ApiError } from './api.js';
import { $, esc, toast } from './ui.js';

let current = null;                         // { id, username, name, role } while signed in
const listeners = new Set();

export const staff = () => current;
export const onStaffChange = (fn) => listeners.add(fn);

function set(next) {
  current = next;
  document.body.classList.toggle('is-staff', Boolean(current));
  $('#staffBadge').hidden = !current;
  $('#staffBadge').innerHTML = current
    ? `<span class="staff-name" title="${esc(current.role)}">${esc(current.name)}</span><button type="button" class="link-btn" id="staffLogout">Log out</button>`
    : '';
  $('#staffLink').textContent = current ? 'Staff: signed in' : 'Staff';
  if (current) $('#staffLogout').onclick = signOut;
  listeners.forEach((fn) => fn(current));
}

export function openSignIn() {
  if (current) return;
  const dialog = $('#staffDialog');
  $('#staffErrors').textContent = '';
  $('#staffForm').reset();
  dialog.showModal();
  $('#staffUser').focus();
}

async function signIn(e) {
  e.preventDefault();
  const button = $('#staffSubmit');
  button.disabled = true;
  try {
    const { staff: who } = await api('/api/login', { method: 'POST', body: { username: $('#staffUser').value, password: $('#staffPass').value } });
    $('#staffPass').value = '';
    $('#staffDialog').close();
    set(who);
    toast(`Signed in as ${who.name}`);
  } catch (err) {
    $('#staffErrors').textContent = err instanceof ApiError ? err.errors.join(' ') : err.message;
    $('#staffPass').select();
  } finally {
    button.disabled = false;
  }
}

async function signOut() {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  set(null);
  toast('Signed out');
}

/** Restores an existing session (cookie on the server, browser storage in the demo). */
export async function initStaff() {
  $('#staffForm').addEventListener('submit', signIn);
  $('#staffLink').addEventListener('click', () => (current ? $('#staffLogout').focus() : openSignIn()));
  addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); openSignIn(); }
  });
  try { set((await api('/api/me')).staff); } catch { set(null); }
}
