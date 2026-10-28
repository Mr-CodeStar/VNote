import React, { useState } from 'react';
import {
  Search,
  Plus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Play,
  Video,
  FileText,
  Mic,
  Edit2,
  Trash2,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Layers,
  Zap,
  CheckCircle2,
  LayoutGrid
} from 'lucide-react';
import { getYouTubeThumbnail, hasValidYouTubeVideo, isYouTubePlaylist } from '../utils/youtube';

const YoutubeIcon = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const BADGE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const getBadgeLabel = (index) => (index + 1 < 10 ? `0${index + 1}` : `${index + 1}`);
const getBadgeColor = (index) => BADGE_COLORS[index % BADGE_COLORS.length];

export default function UnifiedSidebar({
  books = [],
  activeBookId,
  onSelectBook,
  onCreateBook,
  onRenameBook,
  onDeleteBook,

  pages = [],
  activePageId,
  onSelectPage,
  onCreatePage,
  onCreatePagesFromPlaylist,
  onRenamePage,
  onDeletePage,

  onNewCanvasCard,
  onQuickAccessFilter,

  isCollapsed,
  onToggleCollapse
}) {
  // Sidebar view tab: 'workspace' (screen.png) or 'course' (screen copy.png)
  const [sidebarTab, setSidebarTab] = useState('workspace');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Workspace folder expand state
  const [expandedFolders, setExpandedFolders] = useState({ [activeBookId || 'default']: true });

  // Adding Book / Folder state
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  // Course Importer form state
  const [courseTitle, setCourseTitle] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isPlaylistSynced, setIsPlaylistSynced] = useState(false);
  const [autoOutline, setAutoOutline] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Quick Add Page state
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  // Inline editing state
  const [editingPageId, setEditingPageId] = useState(null);
  const [editPageTitle, setEditPageTitle] = useState('');

  const activeBook = books.find((b) => b.id === activeBookId) || (books.length > 0 ? books[0] : null);

  const toggleFolder = (bookId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
  };

  const handleCreateBookSubmit = (e) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    onCreateBook(newBookName.trim());
    setNewBookName('');
    setIsAddingBook(false);
  };

  const handleQuickAddPageSubmit = (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    onCreatePage(newPageTitle.trim());
    setNewPageTitle('');
    setIsAddingPage(false);
  };

  const handleImportCourse = async (e) => {
    e?.preventDefault();
    if (!playlistUrl.trim()) return;
    try {
      setIsImporting(true);
      await onCreatePagesFromPlaylist(playlistUrl.trim(), courseTitle.trim() || null);
      setIsPlaylistSynced(true);
      setPlaylistUrl('');
      setCourseTitle('');
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <aside className="unified-sidebar collapsed">
        <button
          className="sidebar-collapse-toggle-btn"
          onClick={onToggleCollapse}
          title="Expand Sidebar"
        >
          <ChevronRight size={16} />
        </button>
        <div className="collapsed-vertical-label">
          <span>{sidebarTab === 'workspace' ? 'WORKSPACE' : 'COURSE'}</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="unified-sidebar">
      {/* 1. TOP TAB SWITCHER: Workspace View (screen.png) vs Course Playlist View (screen copy.png) */}
      <div className="sidebar-tab-switcher">
        <button
          className={`sidebar-tab-btn ${sidebarTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setSidebarTab('workspace')}
          title="Workspace Folders & Quick Access (screen.png)"
        >
          <Folder size={13} />
          <span>Workspace</span>
        </button>
        <button
          className={`sidebar-tab-btn ${sidebarTab === 'course' ? 'active' : ''}`}
          onClick={() => setSidebarTab('course')}
          title="Import Course & Video Playlist (screen copy.png)"
        >
          <YoutubeIcon size={13} />
          <span>Course Playlist</span>
        </button>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title="Collapse Sidebar"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* 2. MODE A: WORKSPACE FOLDER TREE VIEW (Matches screen.png) */}
      {sidebarTab === 'workspace' && (
        <div className="sidebar-view-container workspace-mode">
          {/* Search bar with ⌘K badge */}
          <div className="sidebar-search-container">
            <div className="search-input-wrapper">
              <Search size={14} className="search-glass-icon" />
              <input
                type="text"
                placeholder="Search notes, transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="shortcut-badge">⌘K</span>
            </div>
          </div>

          <div className="sidebar-scrollable-content">
            {/* WORKSPACE SECTION */}
            <div className="sidebar-section-block">
              <div className="section-header-row">
                <span className="section-label">WORKSPACE</span>
                <button
                  className="section-add-btn"
                  onClick={() => setIsAddingBook(true)}
                  title="Create New Workspace Folder"
                >
                  <Plus size={14} />
                </button>
              </div>

              {isAddingBook && (
                <form className="inline-add-folder-form" onSubmit={handleCreateBookSubmit}>
                  <input
                    type="text"
                    placeholder="Folder name (e.g. fastapi)..."
                    value={newBookName}
                    onChange={(e) => setNewBookName(e.target.value)}
                    autoFocus
                  />
                  <div className="inline-form-actions">
                    <button type="submit" className="mini-btn confirm"><Check size={12} /></button>
                    <button type="button" className="mini-btn" onClick={() => setIsAddingBook(false)}><X size={12} /></button>
                  </div>
                </form>
              )}

              {/* Folders List */}
              <div className="folder-tree-list">
                {books.map((book) => {
                  const isCurrentActiveBook = book.id === activeBookId;
                  const isExpanded = expandedFolders[book.id] ?? isCurrentActiveBook;

                  return (
                    <div key={book.id} className="folder-tree-node">
                      {/* Folder Row */}
                      <div
                        className={`folder-row ${isCurrentActiveBook ? 'active-folder' : ''}`}
                        onClick={() => {
                          onSelectBook(book.id);
                          toggleFolder(book.id);
                        }}
                      >
                        <span className="folder-chevron">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        {isExpanded ? (
                          <FolderOpen size={15} className="folder-icon open" />
                        ) : (
                          <Folder size={15} className="folder-icon" />
                        )}
                        <span className="folder-name">{book.name}</span>

                        <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="folder-action-icon-btn"
                            title={`Rename folder "${book.name}"`}
                            onClick={() => {
                              const newName = prompt('Enter new folder name:', book.name);
                              if (newName && newName.trim() && newName.trim() !== book.name) {
                                onRenameBook(book.id, newName.trim());
                              }
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            className="folder-action-icon-btn danger"
                            title={`Delete folder "${book.name}"`}
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete folder "${book.name}" and all its pages?`)) {
                                onDeleteBook(book.id);
                              }
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Pages inside this folder (when expanded) */}
                      {isExpanded && isCurrentActiveBook && (
                        <div className="folder-children-list">
                          {filteredPages.map((page) => {
                            const isPageActive = page.id === activePageId;
                            return (
                              <div
                                key={page.id}
                                className={`folder-page-item ${isPageActive ? 'selected' : ''}`}
                                onClick={() => onSelectPage(page.id)}
                              >
                                <Play size={11} className="page-play-icon" />
                                <span className="page-item-title">{page.title}</span>

                                <div className="page-actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="page-action-icon-btn"
                                    title="Rename page"
                                    onClick={() => {
                                      const newTitle = prompt('Enter new page title:', page.title);
                                      if (newTitle && newTitle.trim() && newTitle.trim() !== page.title) {
                                        onRenamePage(page.id, newTitle.trim());
                                      }
                                    }}
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="page-action-icon-btn danger"
                                    title="Delete page"
                                    onClick={() => {
                                      if (confirm(`Delete page "${page.title}"?`)) {
                                        onDeletePage(page.id);
                                      }
                                    }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick add page inside folder */}
                          {isAddingPage ? (
                            <form className="inline-add-page-form" onSubmit={handleQuickAddPageSubmit}>
                              <input
                                type="text"
                                placeholder="Page title (e.g. 04 - API Docs)..."
                                value={newPageTitle}
                                onChange={(e) => setNewPageTitle(e.target.value)}
                                autoFocus
                              />
                              <div className="inline-form-actions">
                                <button type="submit" className="mini-btn confirm"><Check size={12} /></button>
                                <button type="button" className="mini-btn" onClick={() => setIsAddingPage(false)}><X size={12} /></button>
                              </div>
                            </form>
                          ) : (
                            <button
                              className="folder-add-page-trigger"
                              onClick={() => setIsAddingPage(true)}
                            >
                              <Plus size={11} />
                              <span>Add Lesson Page</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Button: + New Canvas Card */}
          <div className="sidebar-bottom-action">
            <button className="new-canvas-card-btn" onClick={onNewCanvasCard}>
              <Plus size={15} />
              <span>New Canvas Card</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MODE B: COURSE & PLAYLIST IMPORT VIEW (Matches screen copy.png) */}
      {sidebarTab === 'course' && (
        <div className="sidebar-view-container course-mode">
          {/* Top Row: + Add Page, Search icon, Collapse */}
          <div className="course-mode-top-bar">
            <button className="add-page-pill-outline-btn" onClick={() => setIsAddingPage(true)}>
              <Plus size={14} />
              <span>Add Page</span>
            </button>
            <div className="top-bar-icons">
              <button
                className="icon-circle-btn"
                onClick={() => setSidebarTab('workspace')}
                title="Search Workspace"
              >
                <Search size={14} />
              </button>
              <button
                className="icon-circle-btn"
                onClick={onToggleCollapse}
                title="Collapse Sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>

          {isAddingPage && (
            <form className="course-add-page-box" onSubmit={handleQuickAddPageSubmit}>
              <input
                type="text"
                placeholder="New page or lecture title..."
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                autoFocus
              />
              <div className="form-buttons">
                <button type="submit" className="mini-submit-btn">Create</button>
                <button type="button" className="mini-cancel-btn" onClick={() => setIsAddingPage(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="sidebar-scrollable-content">
            {/* Import YouTube Course Card */}
            <div className="import-course-card">
              <div className="import-card-header">
                <div className="import-title-group">
                  <YoutubeIcon size={15} className="yt-red-icon" />
                  <span className="import-heading">Import YouTube Course</span>
                </div>
                {pages.length > 0 && (
                  <span className="video-count-pill">{pages.length} {pages.length === 1 ? 'Video' : 'Videos'}</span>
                )}
              </div>

              <div className="import-inputs-group">
                <input
                  type="text"
                  className="import-text-input"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Course / Folder Title (e.g. System Design)"
                />
                <input
                  type="text"
                  className="import-text-input"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="youtube.com/playlist?list=..."
                />
              </div>

              {isPlaylistSynced && pages.length > 0 && (
                <div className="sync-status-row">
                  <div className="sync-indicator">
                    <CheckCircle2 size={13} className="check-green-icon" />
                    <span>Playlist Synced</span>
                  </div>
                  <div
                    className={`auto-outline-badge ${autoOutline ? 'active' : ''}`}
                    onClick={() => setAutoOutline(!autoOutline)}
                    title="Toggle Auto-outline"
                  >
                    Auto-outline {autoOutline ? 'ON' : 'OFF'}
                  </div>
                </div>
              )}

              <div className="import-actions-row">
                <button
                  type="button"
                  className="text-cancel-btn"
                  onClick={() => {
                    setPlaylistUrl('');
                    setCourseTitle('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-pages-purple-btn"
                  onClick={handleImportCourse}
                  disabled={isImporting || !playlistUrl.trim()}
                >
                  <Zap size={13} />
                  <span>{isImporting ? 'Syncing...' : 'Create Pages'}</span>
                </button>
              </div>
            </div>

            {/* Course Series / Playlist Section */}
            {activeBook && pages.length > 0 ? (
              <>
                <div className="course-series-header">
                  <div className="series-left">
                    <Folder size={14} className="series-folder-icon" />
                    <span className="series-title">
                      {activeBook.name.toUpperCase()} ({pages.length})
                    </span>
                  </div>
                  <span className="series-progress-label">
                    {pages.filter((p) => p.video_url).length}/{pages.length} Loaded
                  </span>
                </div>

                {/* List of Playlist Videos */}
                <div className="course-videos-list">
                  {filteredPages.map((page, index) => {
                    const isActive = page.id === activePageId;
                    const badgeLabel = getBadgeLabel(index);
                    const badgeColor = getBadgeColor(index);
                    const hasVideo = hasValidYouTubeVideo(page.video_url);
                    const thumbnail = hasVideo ? getYouTubeThumbnail(page.video_url) : null;
                    const isEditing = editingPageId === page.id;

                    if (isEditing) {
                      return (
                        <form
                          key={page.id}
                          className="playlist-item-edit-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (editPageTitle.trim()) {
                              onRenamePage(page.id, editPageTitle.trim());
                            }
                            setEditingPageId(null);
                          }}
                        >
                          <input
                            type="text"
                            value={editPageTitle}
                            onChange={(e) => setEditPageTitle(e.target.value)}
                            autoFocus
                          />
                          <button type="submit" className="mini-btn confirm"><Check size={12} /></button>
                          <button type="button" className="mini-btn" onClick={() => setEditingPageId(null)}><X size={12} /></button>
                        </form>
                      );
                    }

                    // If active or first item, render with thumbnail
                    if (isActive || (index === 0 && thumbnail)) {
                      return (
                        <div
                          key={page.id}
                          className={`course-video-item active-hero-item ${isActive ? 'selected' : ''}`}
                          onClick={() => onSelectPage(page.id)}
                        >
                          <div className="hero-thumb-wrapper">
                            {thumbnail ? (
                              <img src={thumbnail} alt="Video preview" className="hero-thumb-img" />
                            ) : (
                              <div className="hero-thumb-placeholder">
                                <Video size={14} />
                              </div>
                            )}
                            <span className="thumb-cam-badge"><Video size={9} /></span>
                          </div>

                          <div className="hero-item-info">
                            <span className="hero-item-title">{page.title}</span>
                            <div className="hero-badges-row">
                              {hasVideo && <span className="pill-tag video-tag">Video</span>}
                              {page.note_filename && <span className="pill-tag note-tag">Notes</span>}
                            </div>
                          </div>

                          <div className="hero-item-actions">
                            <button
                              className="item-action-icon-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPageId(page.id);
                                setEditPageTitle(page.title);
                              }}
                              title="Rename Page"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              className="item-action-icon-btn danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete page "${page.title}"?`)) {
                                  onDeletePage(page.id);
                                }
                              }}
                              title="Delete Page"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Regular video item
                    return (
                      <div
                        key={page.id}
                        className={`course-video-item standard-item ${isActive ? 'selected' : ''}`}
                        onClick={() => onSelectPage(page.id)}
                      >
                        <div
                          className="custom-tech-badge"
                          style={{ backgroundColor: badgeColor }}
                        >
                          <span className="badge-text">{badgeLabel}</span>
                          <Video size={8} className="badge-cam-icon" />
                        </div>

                        <div className="item-meta-center">
                          <span className="item-title-single-line">{page.title}</span>
                          <div className="item-sub-tags">
                            {hasVideo && <span className="pill-tag video-tag">Video</span>}
                            {page.note_filename && <span className="pill-tag note-tag">Notes</span>}
                          </div>
                        </div>

                        <div className="standard-hover-actions">
                          <button
                            className="item-action-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPageId(page.id);
                              setEditPageTitle(page.title);
                            }}
                            title="Rename"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            className="item-action-icon-btn danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${page.title}"?`)) onDeletePage(page.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-course-state">
                <Folder size={22} className="empty-course-icon" />
                <h4>No Course Loaded</h4>
                <p>Paste a YouTube playlist URL above to auto-generate course pages.</p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Pages Indexed & Refresh */}
          <div className="course-mode-bottom-bar">
            <div className="indexed-status">
              <span className={`green-live-dot ${pages.length === 0 ? 'muted' : ''}`} />
              <span>{pages.length} {pages.length === 1 ? 'Page' : 'Pages'} Indexed</span>
            </div>
            <button
              className="refresh-btn"
              onClick={() => {
                window.location.reload();
              }}
              title="Refresh Playlist Status"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
