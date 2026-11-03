import React, { useState, useEffect, useCallback, useRef } from 'react';
import StudioHeader from './components/StudioHeader';
import UnifiedSidebar from './components/UnifiedSidebar';
import StudioCanvas from './components/StudioCanvas';
import VideoModal from './components/VideoModal';
import ApiKeyModal from './components/ApiKeyModal';
import * as api from './services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import './App.css';

export default function App() {
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState(null);

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);

  const [activeNoteData, setActiveNoteData] = useState({ textNodes: [], strokes: [] });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Light / Dark Theme state (default to 'light' matching the studio screenshot!)
  const [theme, setTheme] = useState(() => localStorage.getItem('vnote_theme') || 'light');

  // Gemini API Key state synced with SQLite database
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [hasGeminiApiKey, setHasGeminiApiKey] = useState(() => Boolean(localStorage.getItem('gemini_api_key')));

  // Canvas Tools & Zoom state
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'pen' | 'highlighter' | 'eraser' | 'pan'
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(4);
  const [zoom, setZoom] = useState(100);

  // Undo / Redo triggers
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  // Video Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  // Gemini API Key Modal state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Ref to canvas component for direct actions
  const canvasRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vnote_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync Gemini API Key with SQLite Database on App Launch
  useEffect(() => {
    async function syncApiKey() {
      try {
        const res = await api.fetchSetting('gemini_api_key');
        if (res && res.value && res.value.trim()) {
          setGeminiApiKey(res.value.trim());
          setHasGeminiApiKey(true);
          localStorage.setItem('gemini_api_key', res.value.trim());
        } else {
          const localKey = localStorage.getItem('gemini_api_key');
          if (localKey && localKey.trim()) {
            await api.saveSetting('gemini_api_key', localKey.trim());
            setGeminiApiKey(localKey.trim());
            setHasGeminiApiKey(true);
          } else {
            setGeminiApiKey('');
            setHasGeminiApiKey(false);
          }
        }
      } catch (e) {
        console.warn('Could not sync Gemini API key with server setting:', e);
      }
    }
    syncApiKey();
  }, []);

  const handleSaveApiKey = async (newKey) => {
    try {
      const trimmed = newKey ? newKey.trim() : '';
      await api.saveSetting('gemini_api_key', trimmed);
      if (trimmed) {
        localStorage.setItem('gemini_api_key', trimmed);
        setGeminiApiKey(trimmed);
        setHasGeminiApiKey(true);
      } else {
        localStorage.removeItem('gemini_api_key');
        setGeminiApiKey('');
        setHasGeminiApiKey(false);
      }
      return true;
    } catch (err) {
      console.error('Failed to save API key:', err);
      if (newKey) {
        localStorage.setItem('gemini_api_key', newKey.trim());
        setGeminiApiKey(newKey.trim());
        setHasGeminiApiKey(true);
      }
      return false;
    }
  };

  const handlePromptSetApiKey = () => {
    setIsApiKeyModalOpen(true);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 10));
  const handleResetZoom = () => setZoom(100);

  // Global Keyboard Shortcuts (Keybindings for Undo, Redo, Zoom, Tools, Pen Size)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.isContentEditable);

      // Handle Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          setUndoCount((c) => c + 1);
        }
        return;
      }

      // Handle Redo: Ctrl+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        if (!isInput) {
          e.preventDefault();
          setRedoCount((c) => c + 1);
        }
        return;
      }

      // Handle Zoom shortcuts: Ctrl+= / Ctrl+- / Ctrl+0
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((prev) => Math.min(200, prev + 10));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setZoom((prev) => Math.max(50, prev - 10));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(100);
        return;
      }

      // If typing in an input/textarea, do not intercept single-key shortcuts
      if (isInput) return;

      // Brush size shortcuts: [ to decrease, ] to increase
      if (e.key === '[') {
        e.preventDefault();
        setLineWidth((prev) => Math.max(1, prev - 2));
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        setLineWidth((prev) => Math.min(32, prev + 2));
        return;
      }

      // Single-key tool switches (only when no modifier key is held)
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key === 'v' || e.key === 'V') {
          setActiveTool('select');
        } else if (e.key === 'p' || e.key === 'P') {
          setActiveTool('pen');
        } else if (e.key === 'h' || e.key === 'H') {
          setActiveTool('pan');
        } else if (e.key === 'e' || e.key === 'E') {
          setActiveTool('eraser');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Initial Load Books
  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchBooks();
      setBooks(data);
      if (data.length > 0) {
        setActiveBookId((prev) => prev || data[0].id);
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Could not connect to Vnote database service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // 2. Load Pages when activeBookId changes
  const loadPages = useCallback(async (bookId) => {
    if (!bookId) {
      setPages([]);
      setActivePageId(null);
      return;
    }
    try {
      const data = await api.fetchPages(bookId);
      setPages(data);
      if (data.length > 0) {
        setActivePageId((prev) => (data.some((p) => p.id === prev) ? prev : data[0].id));
      } else {
        setActivePageId(null);
        setActiveNoteData({ textNodes: [], strokes: [], snapshots: [], outlineData: null, voiceTranscript: null, voiceDuration: 0 });
      }
    } catch (err) {
      console.error('Error fetching pages:', err);
    }
  }, []);

  useEffect(() => {
    if (activeBookId) {
      loadPages(activeBookId);
    }
  }, [activeBookId, loadPages]);

  // 3. Load Notes when activePageId changes
  const loadNotes = useCallback(async (pageId) => {
    const emptyFallback = {
      textNodes: [],
      strokes: [],
      snapshots: [],
      outlineData: null,
      voiceTranscript: null,
      voiceDuration: 0,
      chatMessages: []
    };
    if (!pageId) {
      setActiveNoteData(emptyFallback);
      return;
    }
    try {
      const noteData = await api.fetchPageNotes(pageId);
      setActiveNoteData(noteData || emptyFallback);
    } catch (err) {
      console.error('Error fetching page notes:', err);
      setActiveNoteData(emptyFallback);
    }
  }, []);

  useEffect(() => {
    if (activePageId) {
      loadNotes(activePageId);
    }
  }, [activePageId, loadNotes]);

  // BOOK ACTIONS
  const handleCreateBook = async (name) => {
    try {
      const newBook = await api.createBook(name);
      setBooks((prev) => [...prev, newBook]);
      setActiveBookId(newBook.id);
    } catch (err) {
      console.error('Failed to create book:', err);
    }
  };

  const handleRenameBook = async (id, name) => {
    try {
      const updated = await api.renameBook(id, name);
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, name: updated.name } : b)));
    } catch (err) {
      console.error('Failed to rename book:', err);
    }
  };

  const handleDeleteBook = async (id) => {
    try {
      await api.deleteBook(id);
      const remaining = books.filter((b) => b.id !== id);
      setBooks(remaining);
      if (activeBookId === id) {
        setActiveBookId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  // PAGE ACTIONS
  const handleCreatePage = async (title, videoUrl = null) => {
    if (!activeBookId) return;
    try {
      const newPage = await api.createPage(activeBookId, title, videoUrl);
      setPages((prev) => [...prev, newPage]);
      setActivePageId(newPage.id);
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const handleCreatePagesFromPlaylist = async (playlistUrl, optionalTitle = null) => {
    let targetBookId = activeBookId;
    if (!targetBookId) {
      try {
        const bookName = optionalTitle?.trim() || 'New Course';
        const newBook = await api.createBook(bookName);
        setBooks((prev) => [...prev, newBook]);
        setActiveBookId(newBook.id);
        targetBookId = newBook.id;
      } catch (err) {
        console.error('Failed to create folder for playlist:', err);
        alert('Failed to create folder for playlist.');
        return;
      }
    }
    try {
      const response = await api.createPagesFromPlaylist(targetBookId, playlistUrl);
      if (response.pages && response.pages.length > 0) {
        setPages((prev) => [...prev, ...response.pages]);
        setActivePageId(response.pages[0].id);
      }
    } catch (err) {
      console.error('Failed to create pages from playlist:', err);
      alert('Failed to import playlist. Please check the URL and try again.');
    }
  };

  const handleRenamePage = async (pageId, newTitle) => {
    if (!activeBookId) return;
    try {
      const updated = await api.updatePage(activeBookId, pageId, { title: newTitle });
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, title: updated.title } : p)));
    } catch (err) {
      console.error('Failed to rename page:', err);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!activeBookId) return;
    try {
      await api.deletePage(activeBookId, pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (activePageId === pageId) {
        setActivePageId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  };

  // VIDEO ACTIONS
  const handleSaveVideoUrl = async (newUrl) => {
    if (!activeBookId || !activePageId) return;
    try {
      const updated = await api.updatePage(activeBookId, activePageId, { videoUrl: newUrl });
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, video_url: updated.video_url } : p))
      );
    } catch (err) {
      console.error('Failed to update video URL:', err);
    }
  };

  const handleRemoveVideo = async () => {
    if (!activeBookId || !activePageId) return;
    try {
      const updated = await api.updatePage(activeBookId, activePageId, { videoUrl: null });
      setPages((prev) =>
        prev.map((p) => (p.id === activePageId ? { ...p, video_url: null } : p))
      );
    } catch (err) {
      console.error('Failed to remove video:', err);
    }
  };

  // NOTE SAVING ACTION
  const handleSaveNotes = async (notePayload) => {
    if (!activeBookId || !activePageId) return;
    try {
      setIsSaving(true);
      const result = await api.savePageNotes(activeBookId, activePageId, notePayload);
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, note_filename: result.noteFilename } : p
        )
      );
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeBook = books.find((b) => b.id === activeBookId) || (books.length > 0 ? books[0] : null);
  const activePage = pages.find((p) => p.id === activePageId) || (pages.length > 0 ? pages[0] : null);

  if (loading) {
    return (
      <div className="full-screen-loader">
        <Loader2 className="spinner" size={48} />
        <h2>Launching Vnote Studio...</h2>
        <p>Connecting to SQLite workspace engine</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="full-screen-loader error">
        <AlertCircle size={48} className="error-icon" />
        <h2>Connection Error</h2>
        <p>{error}</p>
        <button className="btn primary-btn" onClick={loadBooks}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="vnote-studio-app-container">
      {/* 1. TOP APP BAR / STUDIO HEADER */}
      <StudioHeader
        activeBook={activeBook}
        activePage={activePage}
        onSavePageTitle={(title) => activePage && handleRenamePage(activePage.id, title)}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        color={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={() => setUndoCount((c) => c + 1)}
        onRedo={() => setRedoCount((c) => c + 1)}
        onOpenVideoModal={() => setIsVideoModalOpen(true)}
        onRemoveVideo={handleRemoveVideo}
        hasGeminiApiKey={hasGeminiApiKey}
        geminiApiKey={geminiApiKey}
        onSaveApiKey={handleSaveApiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* 2. MAIN WORKSPACE ROW: SIDEBAR + STUDIO CANVAS */}
      <div className="studio-workspace-body">
        {/* UNIFIED SIDEBAR (Workspace Tree + Course Playlist) */}
        <UnifiedSidebar
          books={books}
          activeBookId={activeBookId}
          onSelectBook={setActiveBookId}
          onCreateBook={handleCreateBook}
          onRenameBook={handleRenameBook}
          onDeleteBook={handleDeleteBook}
          pages={pages}
          activePageId={activePageId}
          onSelectPage={setActivePageId}
          onCreatePage={handleCreatePage}
          onCreatePagesFromPlaylist={handleCreatePagesFromPlaylist}
          onRenamePage={handleRenamePage}
          onDeletePage={handleDeletePage}
          onNewCanvasCard={() => {
            const addNoteBtn = document.querySelector('.floating-bottom-dock .dock-tool-btn[title*="Add a Text Box"]');
            if (addNoteBtn) addNoteBtn.click();
          }}
          onQuickAccessFilter={(type) => {
            if (type === 'voice') {
              const el = document.getElementById('canvas-card-voicememo');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (type === 'keyframes') {
              const el = document.querySelector('.snapshot-code-card') || document.getElementById('canvas-card-snapshot');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* MAIN STUDIO CANVAS AREA */}
        <main className="studio-canvas-main-area">
          <StudioCanvas
            ref={canvasRef}
            activePage={activePage}
            activeBook={activeBook}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            color={color}
            lineWidth={lineWidth}
            zoom={zoom}
            onResetZoom={handleResetZoom}
            initialNoteData={activeNoteData}
            onSaveNotes={handleSaveNotes}
            isSaving={isSaving}
            onOpenVideoModal={() => setIsVideoModalOpen(true)}
            onRemoveVideo={handleRemoveVideo}
            undoTrigger={undoCount}
            redoTrigger={redoCount}
            hasGeminiApiKey={hasGeminiApiKey}
            geminiApiKey={geminiApiKey}
            onPromptSetApiKey={handlePromptSetApiKey}
          />
        </main>
      </div>

      {/* 3. MODAL FOR ATTACHING / CHANGING VIDEO URL */}
      <VideoModal
        isOpen={isVideoModalOpen}
        initialUrl={activePage?.video_url || ''}
        onClose={() => setIsVideoModalOpen(false)}
        onSave={handleSaveVideoUrl}
      />

      {/* 4. MODAL FOR GEMINI API KEY */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        currentKey={geminiApiKey}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
}
