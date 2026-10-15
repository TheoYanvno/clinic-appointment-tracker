// Builds the live demo for GitHub Pages into docs/.
// GitHub Pages only serves static files, so the site runs the shared router, repository and SQL
// in the browser with sql.js instead of calling the Node server. Run: npm run build:site
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}docs/`;
const SERVER_ONLY = ['server.js', 'sqlFiles.js', 'nodeDriver.js'];

// Start clean, but keep the README screenshots
for (const dir of ['js', 'src', 'sql', 'vendor', 'img']) rmSync(out + dir, { recursive: true, force: true });
for (const file of ['index.html', 'style.css']) rmSync(out + file, { force: true });
mkdirSync(out, { recursive: true });

cpSync(`${root}public`, out, { recursive: true, filter: (src) => !src.endsWith('package.json') });
cpSync(`${root}src`, `${out}src`, { recursive: true, filter: (src) => !SERVER_ONLY.some((name) => src.endsWith(name)) });
mkdirSync(`${out}sql`, { recursive: true });
cpSync(`${root}sql/schema.sql`, `${out}sql/schema.sql`);

// Switch the page into in-browser mode
const html = readFileSync(`${out}index.html`, 'utf8')
  .replace('<meta name="viewport"', '<meta name="portal-mode" content="local">\n  <meta name="viewport"');
writeFileSync(`${out}index.html`, html);
writeFileSync(`${out}.nojekyll`, '');           // serve files exactly as they are

if (!existsSync(`${out}vendor/sql-wasm.wasm`)) throw new Error('sql.js was not copied');
console.log('Built the live demo in docs/. Preview it with: npm run preview');
