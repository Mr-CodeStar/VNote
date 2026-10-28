const API_BASE = '/api';

export async function fetchBooks() {
  const res = await fetch(`${API_BASE}/books`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function createBook(name) {
  const res = await fetch(`${API_BASE}/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to create book');
  return res.json();
}

export async function renameBook(id, name) {
  const res = await fetch(`${API_BASE}/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to rename book');
  return res.json();
}

export async function deleteBook(id) {
  const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
  return res.json();
}

export async function fetchPages(bookId) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages`);
  if (!res.ok) throw new Error('Failed to fetch pages');
  return res.json();
}

export async function createPage(bookId, title, videoUrl = null) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, videoUrl })
  });
  if (!res.ok) throw new Error('Failed to create page');
  return res.json();
}

export async function createPagesFromPlaylist(bookId, playlistUrl) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages/playlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playlistUrl })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create pages from playlist');
  }
  return res.json();
}

export async function updatePage(bookId, pageId, data) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update page');
  return res.json();
}

export async function deletePage(bookId, pageId) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages/${pageId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete page');
  return res.json();
}

export async function fetchPageNotes(pageId) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

export async function savePageNotes(bookId, pageId, noteData) {
  const res = await fetch(`${API_BASE}/books/${bookId}/pages/${pageId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData)
  });
  if (!res.ok) throw new Error('Failed to save notes');
  return res.json();
}

export async function generateAiNotes(pageId, videoUrl, apiKey) {
  const res = await fetch(`${API_BASE}/pages/${pageId}/generate-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, apiKey })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to generate AI notes');
  }
  return res.json();
}

export async function fetchSetting(key) {
  const res = await fetch(`${API_BASE}/settings/${key}`);
  if (!res.ok) throw new Error('Failed to fetch setting');
  return res.json();
}

export async function saveSetting(key, value) {
  const res = await fetch(`${API_BASE}/settings/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
  if (!res.ok) throw new Error('Failed to save setting');
  return res.json();
}

export async function chatWithVideoGemini(params) {
  const res = await fetch(`${API_BASE}/video-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to communicate with Gemini AI');
  }
  return res.json();
}
