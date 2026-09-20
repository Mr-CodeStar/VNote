import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOTES_DIR = path.join(__dirname, '../data/notes');

if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

export function readNoteFile(filename) {
  if (!filename) return null;
  const filePath = path.join(NOTES_DIR, filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading note file ${filename}:`, err);
    return null;
  }
}

export function saveNoteFile(pageId, noteData) {
  // Check if note content is empty (no text boxes and no drawing strokes)
  const hasText = Array.isArray(noteData?.textNodes) && noteData.textNodes.length > 0;
  const hasDrawings = Array.isArray(noteData?.strokes) && noteData.strokes.length > 0;

  const filename = `note_${pageId}.json`;
  const filePath = path.join(NOTES_DIR, filename);

  if (!hasText && !hasDrawings) {
    // If notes are now empty, remove the file if it exists
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting empty note file ${filename}:`, err);
      }
    }
    return null; // Return null so DB can update note_filename to NULL
  }

  // Save notes to file
  const payload = {
    pageId,
    updatedAt: Date.now(),
    textNodes: noteData.textNodes || [],
    strokes: noteData.strokes || []
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filename;
}

export function deleteNoteFile(filename) {
  if (!filename) return;
  const filePath = path.join(NOTES_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting note file ${filename}:`, err);
    }
  }
}
