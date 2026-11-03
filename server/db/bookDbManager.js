import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { DATABASES_DIR } from '../config/paths.js';

const dbConnections = new Map();

export function getBookDb(bookId) {
  if (dbConnections.has(bookId)) {
    return dbConnections.get(bookId);
  }

  const dbPath = path.join(DATABASES_DIR, `book_${bookId}.db`);
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        video_url TEXT DEFAULT NULL,
        note_filename TEXT DEFAULT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  });

  dbConnections.set(bookId, db);
  return db;
}

export function getPagesForBook(bookId) {
  return new Promise((resolve, reject) => {
    const db = getBookDb(bookId);
    db.all(`SELECT * FROM pages ORDER BY created_at ASC`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function createPageInBook(bookId, pageId, title, videoUrl = null) {
  return new Promise((resolve, reject) => {
    const db = getBookDb(bookId);
    const now = Date.now();
    db.run(
      `INSERT INTO pages (id, title, video_url, note_filename, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [pageId, title, videoUrl || null, null, now, now],
      function (err) {
        if (err) reject(err);
        else resolve({ id: pageId, title, video_url: videoUrl, note_filename: null, created_at: now, updated_at: now });
      }
    );
  });
}

export function createPagesBulk(bookId, pagesData) {
  return new Promise((resolve, reject) => {
    const db = getBookDb(bookId);
    const now = Date.now();
    
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare(`INSERT INTO pages (id, title, video_url, note_filename, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
      
      const createdPages = [];
      for (const page of pagesData) {
        const { id, title, videoUrl } = page;
        stmt.run([id, title, videoUrl || null, null, now, now]);
        createdPages.push({ id, title, video_url: videoUrl, note_filename: null, created_at: now, updated_at: now });
      }
      
      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) {
          db.run("ROLLBACK");
          reject(err);
        } else {
          resolve(createdPages);
        }
      });
    });
  });
}

export function updatePageInBook(bookId, pageId, { title, videoUrl, noteFilename }) {
  return new Promise((resolve, reject) => {
    const db = getBookDb(bookId);
    const now = Date.now();
    
    // Fetch existing page to merge non-provided fields
    db.get(`SELECT * FROM pages WHERE id = ?`, [pageId], (err, existing) => {
      if (err) return reject(err);
      if (!existing) return reject(new Error('Page not found'));

      const newTitle = title !== undefined ? title : existing.title;
      const newVideoUrl = videoUrl !== undefined ? videoUrl : existing.video_url;
      const newNoteFilename = noteFilename !== undefined ? noteFilename : existing.note_filename;

      db.run(
        `UPDATE pages SET title = ?, video_url = ?, note_filename = ?, updated_at = ? WHERE id = ?`,
        [newTitle, newVideoUrl, newNoteFilename, now, pageId],
        function (updateErr) {
          if (updateErr) reject(updateErr);
          else resolve({
            id: pageId,
            title: newTitle,
            video_url: newVideoUrl,
            note_filename: newNoteFilename,
            updated_at: now
          });
        }
      );
    });
  });
}

export function deletePageFromBook(bookId, pageId) {
  return new Promise((resolve, reject) => {
    const db = getBookDb(bookId);
    db.get(`SELECT note_filename FROM pages WHERE id = ?`, [pageId], (err, row) => {
      if (err) return reject(err);
      const noteFilename = row ? row.note_filename : null;
      db.run(`DELETE FROM pages WHERE id = ?`, [pageId], function (deleteErr) {
        if (deleteErr) reject(deleteErr);
        else resolve({ success: true, pageId, noteFilename });
      });
    });
  });
}

export function deleteBookDatabaseFile(bookId) {
  const dbPath = path.join(DATABASES_DIR, `book_${bookId}.db`);
  const safeUnlink = () => {
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch (e) {
        console.error(`Could not unlink DB file ${dbPath}:`, e);
      }
    }
  };

  if (dbConnections.has(bookId)) {
    const db = dbConnections.get(bookId);
    dbConnections.delete(bookId);
    db.close((err) => {
      if (err) console.error(`Error closing database ${bookId}:`, err);
      safeUnlink();
    });
  } else {
    safeUnlink();
  }
}
