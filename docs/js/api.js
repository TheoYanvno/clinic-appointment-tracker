// One way to call the API. On the Node server it uses fetch; in the live demo (no server),
// local.js runs the same router and SQL in the browser. Either way callers get JSON back.
const LOCAL = document.querySelector('meta[name="portal-mode"]')?.content === 'local';

export class ApiError extends Error {
  constructor(errors, status) {
    super(errors.join('\n'));
    this.errors = errors;
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  if (LOCAL) {
    const { request } = await import('./local.js');
    const result = await request(method, path, body);
    if (result.status >= 400) throw new ApiError(result.body.errors ?? ['Something went wrong'], result.status);
    return result.body;
  }
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.errors ?? ['Something went wrong'], res.status);
  return data;
}

export const isLocal = LOCAL;
