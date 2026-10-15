// Database driver for Node.js, using the built-in node:sqlite module.
// Every driver exposes the same four methods, so the repository works with either engine.
import { DatabaseSync } from 'node:sqlite';

export function openNodeDatabase(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  return {
    engine: 'node:sqlite',
    exec: (sql) => db.exec(sql),
    all: (sql, params = []) => db.prepare(sql).all(...params).map((row) => ({ ...row })),
    get: (sql, params = []) => { const row = db.prepare(sql).get(...params); return row ? { ...row } : undefined; },
    run: (sql, params = []) => {
      const result = db.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastId: Number(result.lastInsertRowid) };
    },
    close: () => db.close(),
  };
}
