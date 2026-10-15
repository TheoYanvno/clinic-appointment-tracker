// Reads the .sql files from disk (Node only; the browser fetches them instead).
import { readFileSync } from 'node:fs';

export const readSql = (name) => readFileSync(new URL(`../sql/${name}`, import.meta.url), 'utf8');
