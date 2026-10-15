// Serves docs/ (the GitHub Pages build) locally, to try the in-browser version: npm run preview
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../docs', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.sql': 'text/plain' };
const port = process.env.PORT || 4000;
http.createServer((req, res) => {
  const file = path.join(docs, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
  if (!file.startsWith(docs) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Live demo preview at http://localhost:${port}`));
