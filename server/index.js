import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllBooks,
  createBookInMaster,
  renameBookInMaster,
  deleteBookFromMaster,
  getSetting,
  setSetting,
  deleteSetting
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
    const { textNodes, strokes, voiceTranscript, voiceDuration, snapshots, outlineData } = req.body;

    // Save note to file
    const noteFilename = saveNoteFile(pageId, {
      textNodes,
      strokes,
      voiceTranscript,
      voiceDuration,
      snapshots,
      outlineData
    });

    // Update SQLite database note_filename column (becomes filename if saved, or NULL if empty)
    await updatePageInBook(bookId, pageId, { noteFilename });

    res.json({ success: true, noteFilename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

function extractCleanErrorMessage(err) {
  if (!err) return 'Unknown error';
  const msg = err.message || String(err);
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch (e) {}
  return msg;
}

async function callGeminiWithFallback(ai, contents, config = {}) {
  let lastErr = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config
      });
      if (response && response.text) {
        return { text: response.text, model: modelName };
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Attempt with ${modelName} failed:`, err.message);
    }
  }
  throw lastErr || new Error('Failed to get response from Gemini.');
}

app.post('/api/pages/:pageId/generate-notes', async (req, res) => {
  try {
    const { pageId } = req.params;
    const { videoUrl, apiKey: bodyApiKey } = req.body;
    
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });

    let apiKey = bodyApiKey;
    if (!apiKey) {
      apiKey = await getSetting('gemini_api_key');
    }
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
    
    const result = await callGeminiWithFallback(ai, prompt, { maxOutputTokens: 8192 });

    const markdownOutput = result.text;
    res.json({ success: true, notes: markdownOutput, modelUsed: result.model });
  } catch (err) {
    console.error('Error generating notes:', err);
    res.status(500).json({ error: extractCleanErrorMessage(err) || 'Failed to generate notes' });
  }
});

function extractVideoId(url) {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split(/[?#]/)[0];
    }
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }
  } catch (e) {}
  return url;
}

async function fetchVideoTranscript(videoUrl) {
  if (!videoUrl) return '';
  // 1. Try YoutubeTranscript
  try {
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoUrl);
    if (transcriptResponse && transcriptResponse.length > 0) {
      return transcriptResponse.map((t) => t.text).join(' ');
    }
  } catch (err1) {
    console.warn('YoutubeTranscript failed:', err1.message);
  }

  // 2. Fallback to Innertube
  try {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      const yt = await Innertube.create();
      const info = await yt.getInfo(videoId);
      const transcriptData = await info.getTranscript();
      if (transcriptData?.transcript?.content?.body?.initial_segments) {
        return transcriptData.transcript.content.body.initial_segments
          .map((seg) => seg.snippet?.text || '')
          .join(' ');
      }
    }
  } catch (err2) {
    console.warn('Innertube transcript fetch failed:', err2.message);
  }

  return '';
}

// 5. Settings API (SQLite Master DB)
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await getSetting(key);
    res.json({ key, value: value || null, hasValue: Boolean(value && value.trim()) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Value required' });
    }
    const result = await setSetting(key, value ? value.trim() : '');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    await deleteSetting(key);
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Video Chat with Gemini
app.post('/api/video-chat', async (req, res) => {
  try {
    const {
      videoUrl,
      pageTitle,
      message,
      history = [],
      apiKey: bodyApiKey,
      action = 'chat',
      transcript: clientTranscript
    } = req.body;

    // Check body or SQLite database for Gemini API Key
    let apiKey = bodyApiKey;
    if (!apiKey) {
      apiKey = await getSetting('gemini_api_key');
    }

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        error: 'Gemini API Key is not configured in the database. Please set it in your workspace profile (top-right menu).'
      });
    }

    apiKey = apiKey.trim();

    // Transcript handling
    let transcriptText = clientTranscript || '';
    if (!transcriptText && videoUrl) {
      transcriptText = await fetchVideoTranscript(videoUrl);
    }

    const hasTranscript = Boolean(transcriptText && transcriptText.trim());
    const safeTranscript = hasTranscript ? transcriptText.slice(0, 45000) : '';

    const systemInstruction = `You are a friendly, expert AI Study Tutor & Copilot inside the Vnote note-taking studio.
The student is currently learning from a video titled "${pageTitle || 'Video Lecture'}".
${hasTranscript ? `Here is the verbatim transcript of the video lecture:\n"""\n${safeTranscript}\n"""\n` : `Note: Closed captions could not be automatically downloaded for this video, but answer authoritatively regarding "${pageTitle || 'the video'}" and its subject.\n`}
Guidelines:
1. Ground your answers directly in the concepts, code, and explanations taught in this video.
2. Provide clear, structured, well-formatted Markdown with bold keywords, bullet points, and code snippets when relevant.
3. Be encouraging, concise, and focused on helping the student take great notes and master the material.
4. Keep answers readable and directly useful for note-taking.`;

    let userPrompt = message;
    if (action === 'init') {
      userPrompt = hasTranscript
        ? `I just opened this video lecture on "${pageTitle || 'this topic'}". Please give me a friendly 2-3 sentence welcome, summarizing the key theme of this video based on the transcript, and provide 3 quick bulleted questions or topics I can ask you about this lecture.`
        : `I just opened this video lecture on "${pageTitle || 'this topic'}". Please give me a friendly 2-3 sentence welcome for "${pageTitle || 'this lecture'}", and suggest 3 key study questions or topics I can explore with you for this lesson.`;
    }

    // Build context
    let promptWithContext = `${systemInstruction}\n\n`;
    if (history && history.length > 0) {
      promptWithContext += `--- Previous Conversation ---\n`;
      for (const h of history.slice(-6)) {
        const roleName = (h.role === 'ai' || h.role === 'model' || h.sender === 'ai') ? 'AI Tutor' : 'Student';
        promptWithContext += `${roleName}: ${h.text}\n`;
      }
      promptWithContext += `-----------------------------\n\n`;
    }
    promptWithContext += `Student: ${userPrompt}\n\nAI Tutor:`;

    const ai = new GoogleGenAI({ apiKey });
    const result = await callGeminiWithFallback(ai, promptWithContext, { maxOutputTokens: 4096 });

    res.json({
      success: true,
      reply: result.text,
      modelUsed: result.model,
      transcript: transcriptText || null,
      hasTranscript
    });
  } catch (err) {
    console.error('Error in video-chat endpoint:', err);
    res.status(500).json({ error: extractCleanErrorMessage(err) || 'Error communicating with Gemini' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Vnote Backend running on http://localhost:${PORT}`);
});

