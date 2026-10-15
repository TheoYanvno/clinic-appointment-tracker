// Database driver for the browser, using sql.js (SQLite compiled to WebAssembly).
// Same four methods as the Node driver, so the same repository and SQL run in both places.
const clean = (params) => params.map((p) => (p === undefined ? null : p));

export function wrapSqlJsDatabase(db) {
  db.run('PRAGMA foreign_keys = ON;');
  const all = (sql, params = []) => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(clean(params));
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  };
  return {
    engine: 'sql.js',
    exec: (sql) => db.exec(sql),
    all,
    get: (sql, params = []) => all(sql, params)[0],
    run: (sql, params = []) => {
      db.run(sql, clean(params));
      const changes = db.getRowsModified();
      const lastId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0];
      return { changes, lastId };
    },
    export: () => db.export(),          // Uint8Array of the whole database file, for saving
    close: () => db.close(),
  };
}
