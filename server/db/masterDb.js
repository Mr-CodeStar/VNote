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
    masterDbInstance.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
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

export function getSetting(key) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
}

export function setSetting(key, value) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    const now = Date.now();
    db.run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now],
      function (err) {
        if (err) reject(err);
        else resolve({ key, value, updated_at: now });
      }
    );
  });
}

export function deleteSetting(key) {
  return new Promise((resolve, reject) => {
    const db = getMasterDb();
    db.run(`DELETE FROM settings WHERE key = ?`, [key], function (err) {
      if (err) reject(err);
      else resolve({ success: true, key });
    });
  });
}
