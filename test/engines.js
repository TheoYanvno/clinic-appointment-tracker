// Runs each test against both database engines: Node's built-in node:sqlite and sql.js (the browser engine).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { openNodeDatabase } from '../src/db/nodeDriver.js';
import { wrapSqlJsDatabase } from '../src/db/sqljsDriver.js';

const require = createRequire(import.meta.url);
const initSqlJs = require('../public/vendor/sql-wasm.js');
const SQL = await initSqlJs({ locateFile: (file) => fileURLToPath(new URL(`../public/vendor/${file}`, import.meta.url)) });

export const ENGINES = [
  ['node:sqlite', () => openNodeDatabase()],
  ['sql.js', () => wrapSqlJsDatabase(new SQL.Database())],
];
