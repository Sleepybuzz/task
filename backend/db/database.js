const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'taskflow.db');

let db = null;
let rawDb = null;
let dirty = false;

setInterval(() => {
  if (dirty && rawDb) { persistDb(); dirty = false; }
}, 3000);

function persistDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function flattenParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  // convert undefined/null properly
  return params.map(p => (p === undefined ? null : p));
}

function createWrapper(raw) {
  function exec(sql) {
    raw.run(sql);
    dirty = true;
  }

  function prepare(sql) {
    return {
      run(...params) {
        raw.run(sql, flattenParams(params));
        dirty = true;
        const res = raw.exec("SELECT last_insert_rowid() as id");
        return { lastInsertRowid: res[0]?.values[0]?.[0] ?? 0, changes: 1 };
      },
      get(...params) {
        const stmt = raw.prepare(sql);
        stmt.bind(flattenParams(params));
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const fp = flattenParams(params);
        let results;
        try {
          results = raw.exec(sql, fp.length ? fp : undefined);
        } catch(e) {
          throw e;
        }
        if (!results || !results[0]) return [];
        const { columns, values } = results[0];
        return values.map(row => {
          const obj = {};
          columns.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        });
      }
    };
  }

  return { exec, prepare };
}

function initSchema(raw) {
  raw.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#7c6bff',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      project_id INTEGER NOT NULL,
      assigned_to INTEGER,
      created_by INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

async function initDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(buf);
  } else {
    rawDb = new SQL.Database();
  }
  rawDb.run('PRAGMA foreign_keys = ON;');
  initSchema(rawDb);
  persistDb();
  db = createWrapper(rawDb);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { initDb, getDb, persistDb };
