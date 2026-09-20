import React, { useState, useEffect, useCallback } from 'react';
import SidebarBooks from './components/SidebarBooks';
import SidebarPages from './components/SidebarPages';
import WorkspaceHeader from './components/WorkspaceHeader';
import VideoPlayerSection from './components/VideoPlayerSection';
import GapSection from './components/GapSection';
import NoteCanvasContainer from './components/NoteCanvas/NoteCanvasContainer';
import VideoModal from './components/VideoModal';
import * as api from './services/api';
import { hasValidYouTubeVideo } from './utils/youtube';
import { Loader2, BookOpen, AlertCircle } from 'lucide-react';
import './App.css';

export default function App() {
  const [books, setBooks] = useState([]);
  const [activeBookId, setActiveBookId] = useState(null);

  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);

  const [activeNoteData, setActiveNoteData] = useState({ textNodes: [], strokes: [] });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAiNotes, setIsGeneratingAiNotes] = useState(false);
  const [error, setError] = useState(null);

  // Sidebar collapse states
  const [isBooksCollapsed, setIsBooksCollapsed] = useState(false);
  const [isPagesCollapsed, setIsPagesCollapsed] = useState(false);

  // Light / Dark Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('vnote_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vnote_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Video modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Timestamp trigger from video to canvas
  const [timestampToInsert, setTimestampToInsert] = useState(null);

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
      setError('Could not connect to Vnote database server.');
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
        setActivePageId(data[0].id);
      } else {
        setActivePageId(null);
        setActiveNoteData({ textNodes: [], strokes: [] });
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
    if (!pageId) {
      setActiveNoteData({ textNodes: [], strokes: [] });
      return;
    }
    try {
      const noteData = await api.fetchPageNotes(pageId);
      setActiveNoteData(noteData || { textNodes: [], strokes: [] });
    } catch (err) {
      console.error('Error fetching page notes:', err);
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

  const handleCreatePagesFromPlaylist = async (playlistUrl) => {
    if (!activeBookId) return;
    try {
      const response = await api.createPagesFromPlaylist(activeBookId, playlistUrl);
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
      
      // Update local pages state note_filename badge
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

  const handleGenerateAiNotes = async () => {
    if (!activePage || !activePage.video_url) return;
    
    const storedKey = localStorage.getItem('gemini_api_key');
    if (!storedKey) {
      alert('No Gemini API key found. Please click the User icon in the top right to set your API key first.');
      return;
    }
    
    try {
      setIsGeneratingAiNotes(true);
      const data = await api.generateAiNotes(activePage.id, activePage.video_url, storedKey);
      
      const newTextNode = {
        id: `ai-note-${Date.now()}`,
        nodeType: 'text',
        x: 40,
        y: 40,
        width: 720,
        content: data.notes,
        textColor: 'var(--text-main)',
      };
      
      const updatedNodes = [...(activeNoteData.textNodes || []), newTextNode];
      const newNoteData = { ...activeNoteData, textNodes: updatedNodes };
      
      setActiveNoteData(newNoteData);
      
      // Save it automatically
      await handleSaveNotes(newNoteData);
    } catch (err) {
      console.error('Failed to generate notes:', err);
      alert('Error generating AI Notes: ' + err.message);
    } finally {
      setIsGeneratingAiNotes(false);
    }
  };

  const activeBook = books.find((b) => b.id === activeBookId);
  const activePage = pages.find((p) => p.id === activePageId);

  if (loading) {
    return (
      <div className="full-screen-loader">
        <Loader2 className="spinner" size={48} />
        <h2>Launching Vnote...</h2>
        <p>Connecting to SQLite database service</p>
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
    <div className="vnote-app-container">
      {/* VERTICAL SECTION 1: BOOKS */}
      <SidebarBooks
        books={books}
        activeBookId={activeBookId}
        onSelectBook={setActiveBookId}
        onCreateBook={handleCreateBook}
        onRenameBook={handleRenameBook}
        onDeleteBook={handleDeleteBook}
        isCollapsed={isBooksCollapsed}
        onToggleCollapse={() => setIsBooksCollapsed(!isBooksCollapsed)}
      />

      {/* VERTICAL SECTION 2: PAGES */}
      <SidebarPages
        pages={pages}
        activePageId={activePageId}
        activeBookName={activeBook?.name}
        onSelectPage={setActivePageId}
        onCreatePage={handleCreatePage}
        onCreatePagesFromPlaylist={handleCreatePagesFromPlaylist}
        onRenamePage={handleRenamePage}
        onDeletePage={handleDeletePage}
        isCollapsed={isPagesCollapsed}
        onToggleCollapse={() => setIsPagesCollapsed(!isPagesCollapsed)}
      />

      {/* MAIN WORKSPACE AREA */}
      <main className="workspace-main-area">
        {activePage ? (
          <>
            {/* WORKSPACE HEADER with TOP-RIGHT CIRCULAR VIDEO BUTTON */}
            <WorkspaceHeader
              activeBook={activeBook}
              activePage={activePage}
              onOpenVideoModal={() => setIsVideoModalOpen(true)}
              onRemoveVideo={handleRemoveVideo}
              onSavePageTitle={(title) => handleRenamePage(activePage.id, title)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />

            {/* DYNAMIC CONTENT LAYOUT */}
            <div className="workspace-dynamic-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <NoteCanvasContainer
                initialNoteData={activeNoteData}
                onSaveNotes={handleSaveNotes}
                isSaving={isSaving}
                insertedTimestamp={timestampToInsert}
                videoComponent={
                  hasValidYouTubeVideo(activePage?.video_url) ? (
                    <>
                      <div className="video-player-container">
                        <VideoPlayerSection
                          key={activePage.id}
                          videoUrl={activePage.video_url}
                          onInsertTimestamp={(stamp) => setTimestampToInsert(stamp)}
                        />
                      </div>
                      <GapSection onGenerateAiNotes={handleGenerateAiNotes} isGenerating={isGeneratingAiNotes} />
                    </>
                  ) : null
                }
              />
            </div>
          </>
        ) : (
          <div className="empty-workspace-state">
            <BookOpen size={64} className="empty-icon" />
            <h2>No Page Selected</h2>
            <p>Select or create a page from the sidebar to start learning and taking notes.</p>
          </div>
        )}
      </main>

      {/* MODAL FOR ADDING/EDITING VIDEO LINK */}
      <VideoModal
        isOpen={isVideoModalOpen}
        initialUrl={activePage?.video_url || ''}
        onClose={() => setIsVideoModalOpen(false)}
        onSave={handleSaveVideoUrl}
      />
    </div>
  );
}
