import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MASTER_DB_PATH = path.join(DATA_DIR, 'master.db');

let masterDbInstance = null;

function getMasterDb() {
  if (masterDbInstance) return masterDbInstance;

  masterDbInstance = new sqlite3.Database(MASTER_DB_PATH);
  
  masterDbInstance.serialize(() => {
    masterDbInstance.run(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  });

  return masterDbInstance;
}

export function getAllBooks() {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    db.all(`SELECT * FROM books ORDER BY created_at ASC`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function createBookInMaster(id, name) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    const now = Date.now();
    db.run(
      `INSERT INTO books (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [id, name, now, now],
      function (err) {
        if (err) reject(err);
        else resolve({ id, name, created_at: now, updated_at: now });
      }
    );
  });
}

export function renameBookInMaster(id, name) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    const now = Date.now();
    db.run(
      `UPDATE books SET name = ?, updated_at = ? WHERE id = ?`,
      [name, now, id],
      function (err) {
        if (err) reject(err);
        else resolve({ id, name, updated_at: now });
      }
    );
  });
}

export function deleteBookFromMaster(id) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    db.run(`DELETE FROM books WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true, id });
    });
  });
}
