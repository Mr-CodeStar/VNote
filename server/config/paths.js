import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback to local server/data directory in dev mode
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../server/data');

// Use custom directory (e.g. Electron app.getPath('userData')) if provided
export const DATA_DIR = process.env.VNOTE_DATA_DIR
  ? path.resolve(process.env.VNOTE_DATA_DIR)
  : DEFAULT_DATA_DIR;

export const DATABASES_DIR = path.join(DATA_DIR, 'databases');
export const NOTES_DIR = path.join(DATA_DIR, 'notes');

// Ensure target directories exist
for (const dir of [DATA_DIR, DATABASES_DIR, NOTES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// When running with custom user directory for the first time, migrate existing dev data if available
if (process.env.VNOTE_DATA_DIR && fs.existsSync(DEFAULT_DATA_DIR) && DATA_DIR !== DEFAULT_DATA_DIR) {
  try {
    const srcMaster = path.join(DEFAULT_DATA_DIR, 'master.db');
    const destMaster = path.join(DATA_DIR, 'master.db');
    if (fs.existsSync(srcMaster) && !fs.existsSync(destMaster)) {
      fs.copyFileSync(srcMaster, destMaster);
    }

    const srcDbs = path.join(DEFAULT_DATA_DIR, 'databases');
    if (fs.existsSync(srcDbs)) {
      for (const file of fs.readdirSync(srcDbs)) {
        const src = path.join(srcDbs, file);
        const dest = path.join(DATABASES_DIR, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }

    const srcNotes = path.join(DEFAULT_DATA_DIR, 'notes');
    if (fs.existsSync(srcNotes)) {
      for (const file of fs.readdirSync(srcNotes)) {
        const src = path.join(srcNotes, file);
        const dest = path.join(NOTES_DIR, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  } catch (err) {
    console.warn('[VNote Paths] Notice: Initial data migration note:', err.message);
  }
}
