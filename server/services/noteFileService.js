import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
import { NOTES_DIR } from '../config/paths.js';

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

  const hasVoice = Boolean(noteData?.voiceTranscript);
  const hasSnapshots = Array.isArray(noteData?.snapshots) && noteData.snapshots.length > 0;
  const hasOutline = Boolean(noteData?.outlineData);
  const hasChat = Array.isArray(noteData?.chatMessages) && noteData.chatMessages.length > 0;

  const filename = `note_${pageId}.json`;
  const filePath = path.join(NOTES_DIR, filename);

  if (!hasText && !hasDrawings && !hasVoice && !hasSnapshots && !hasOutline && !hasChat) {
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
    strokes: noteData.strokes || [],
    voiceTranscript: noteData.voiceTranscript || null,
    voiceDuration: noteData.voiceDuration || null,
    snapshots: noteData.snapshots || [],
    outlineData: noteData.outlineData || null,
    chatMessages: noteData.chatMessages || []
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
