import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllBooks,
  createBookInMaster,
  renameBookInMaster,
  deleteBookFromMaster
} from './db/masterDb.js';
import {
  getPagesForBook,
  createPageInBook,
  createPagesBulk,
  updatePageInBook,
  deletePageFromBook,
  deleteBookDatabaseFile
} from './db/bookDbManager.js';
import {
  readNoteFile,
  saveNoteFile,
  deleteNoteFile
} from './services/noteFileService.js';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// No initial dummy data seeding - User creates folders and data from scratch

// Routes

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Books API
app.get('/api/books', async (req, res) => {
  try {
    const books = await getAllBooks();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Book name required' });
    const id = uuidv4();
    const newBook = await createBookInMaster(id, name);
    res.json(newBook);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updated = await renameBookInMaster(id, name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Get all pages to cleanup note files
    const pages = await getPagesForBook(id);
    for (const page of pages) {
      if (page.note_filename) {
        deleteNoteFile(page.note_filename);
      }
    }
    deleteBookDatabaseFile(id);
    await deleteBookFromMaster(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Pages API for a Book
app.get('/api/books/:bookId/pages', async (req, res) => {
  try {
    const { bookId } = req.params;
    const pages = await getPagesForBook(bookId);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books/:bookId/pages', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, videoUrl } = req.body;
    const pageId = uuidv4();
    const page = await createPageInBook(bookId, pageId, title || 'Untitled Page', videoUrl || null);
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books/:bookId/pages/playlist', async (req, res) => {
  try {
    const { bookId } = req.params;
    const { playlistUrl } = req.body;
    
    if (!playlistUrl) return res.status(400).json({ error: 'Playlist URL required' });
    
    let playlistId = playlistUrl;
    try {
      const urlObj = new URL(playlistUrl);
      if (urlObj.searchParams.has('list')) {
        playlistId = urlObj.searchParams.get('list');
      }
    } catch (e) {
      // not a URL, use as ID
    }
    const yt = await Innertube.create();
    const playlist = await yt.getPlaylist(playlistId);
    const items = playlist.videos || playlist.items;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Could not fetch playlist or playlist is empty.' });
    }

    const pagesData = items.map(item => ({
      id: uuidv4(),
      title: item.title?.text || item.title?.toString() || item.renderer_context?.accessibility_context?.label || 'Untitled',
      videoUrl: `https://www.youtube.com/watch?v=${item.id || item.videoId || item.content_id}`
    }));

    const newPages = await createPagesBulk(bookId, pagesData);
    res.json({ success: true, createdCount: newPages.length, pages: newPages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/books/:bookId/pages/:pageId', async (req, res) => {
  try {
    const { bookId, pageId } = req.params;
    const { title, videoUrl } = req.body;
    const updated = await updatePageInBook(bookId, pageId, { title, videoUrl });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/books/:bookId/pages/:pageId', async (req, res) => {
  try {
    const { bookId, pageId } = req.params;
    const result = await deletePageFromBook(bookId, pageId);
    if (result.noteFilename) {
      deleteNoteFile(result.noteFilename);
    }
    res.json({ success: true, pageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Notes API for a Page
app.get('/api/pages/:pageId/notes', async (req, res) => {
  try {
    const { pageId } = req.params;
    const filename = `note_${pageId}.json`;
    const noteData = readNoteFile(filename);
    res.json(noteData || { textNodes: [], strokes: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books/:bookId/pages/:pageId/notes', async (req, res) => {
  try {
    const { bookId, pageId } = req.params;
    const { textNodes, strokes } = req.body;

    // Save note to file
    const noteFilename = saveNoteFile(pageId, { textNodes, strokes });

    // Update SQLite database note_filename column (becomes filename if saved, or NULL if empty)
    await updatePageInBook(bookId, pageId, { noteFilename });

    res.json({ success: true, noteFilename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pages/:pageId/generate-notes', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { videoUrl, apiKey: bodyApiKey } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    const apiKey = bodyApiKey;
    if (!apiKey) return res.status(400).json({ error: 'Gemini API Key is not provided. Please set it in your profile.' });

    // Fetch transcript
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoUrl);
    const transcriptText = transcriptResponse.map(t => t.text).join(' ');

    if (!transcriptText) {
      return res.status(400).json({ error: 'Could not extract transcript from video.' });
    }

    // Call Gemini
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Act as an expert tutor. Summarize this transcript into detailed notes with headings and bullet points.\n\nTranscript: ${transcriptText}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { maxOutputTokens: 8192 }
    });

    const markdownOutput = response.text;
    res.json({ success: true, notes: markdownOutput });
  } catch (err) {
    console.error('Error generating notes:', err);
    res.status(500).json({ error: err.message || 'Failed to generate notes' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Vnote Backend running on http://localhost:${PORT}`);
});
