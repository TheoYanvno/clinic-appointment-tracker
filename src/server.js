// Small REST API using only Node's built-in http module (no frameworks).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ClinicRepository } from './ClinicRepository.js';
import { openNodeDatabase } from './db/nodeDriver.js';
import { readSql } from './sqlFiles.js';
import { validateAppointment, isValidStatus } from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer(repo) {
  const send = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const readJson = (req) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
  });

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && url.pathname === '/api/appointments') {
        return send(res, 200, repo.listByDate(url.searchParams.get('date') ?? '2026-10-19'));
      }
      if (req.method === 'POST' && url.pathname === '/api/appointments') {
        const body = await readJson(req);
        const errors = validateAppointment(body);
        if (errors.length) return send(res, 400, { errors });
        return send(res, 201, { id: repo.create(body) });
      }
      const match = url.pathname.match(/^\/api\/appointments\/(\d+)\/status$/);
      if (req.method === 'PATCH' && match) {
        const { status } = await readJson(req);
        if (!isValidStatus(status)) return send(res, 400, { errors: ['Unknown status'] });
        return repo.updateStatus(Number(match[1]), status)
          ? send(res, 200, { ok: true })
          : send(res, 404, { errors: ['Appointment not found'] });
      }
      if (req.method === 'GET' && url.pathname === '/api/reports/workload') return send(res, 200, repo.providerWorkload());
      if (req.method === 'GET' && url.pathname === '/api/patients') return send(res, 200, repo.patients());
      if (req.method === 'GET' && url.pathname === '/api/providers') return send(res, 200, repo.providers());

      // Static front end
      const file = path.join(__dirname, '..', 'public', url.pathname === '/' ? 'index.html' : url.pathname);
      if (file.startsWith(path.join(__dirname, '..', 'public')) && fs.existsSync(file)) {
        const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
        res.writeHead(200, { 'Content-Type': type });
        return fs.createReadStream(file).pipe(res);
      }
      send(res, 404, { errors: ['Not found'] });
    } catch (err) {
      // e.g. UNIQUE constraint (double-booking) or foreign key failure
      send(res, 409, { errors: [err.message] });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openNodeDatabase(path.join(__dirname, '..', 'clinic.db'));
  const repo = new ClinicRepository(db).init({ schema: readSql('schema.sql'), seed: readSql('seed.sql') });
  const port = process.env.PORT || 3000;
  createServer(repo).listen(port, () => console.log(`Clinic tracker running at http://localhost:${port}`));
}

