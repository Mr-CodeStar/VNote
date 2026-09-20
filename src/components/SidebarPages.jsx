import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Video, FileCode, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getYouTubeThumbnail, hasValidYouTubeVideo, isYouTubePlaylist } from '../utils/youtube';

export default function SidebarPages({
  pages,
  activePageId,
  activeBookName,
  onSelectPage,
  onCreatePage,
  onCreatePagesFromPlaylist,
  onRenamePage,
  onDeletePage,
  isCollapsed,
  onToggleCollapse
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageVideoUrl, setNewPageVideoUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const titleVal = newPageTitle.trim();
    const urlVal = newPageVideoUrl.trim();

    if (isYouTubePlaylist(urlVal)) {
      setIsImporting(true);
      await onCreatePagesFromPlaylist(urlVal);
      setIsImporting(false);
    } else if (isYouTubePlaylist(titleVal)) {
      setIsImporting(true);
      await onCreatePagesFromPlaylist(titleVal);
      setIsImporting(false);
    } else {
      if (!titleVal) return;
      onCreatePage(titleVal, urlVal || null);
    }
    
    setNewPageTitle('');
    setNewPageVideoUrl('');
    setIsAdding(false);
  };

  const handleRenameSubmit = (id, e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onRenamePage(id, editTitle.trim());
    setEditingId(null);
  };

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button
          className="icon-button"
          onClick={onToggleCollapse}
          title="Expand Pages"
        >
          <ChevronRight size={16} />
        </button>
        <div className="collapsed-title">PAGES</div>
      </div>
    );
  }

  return (
    <aside className="sidebar-section pages-sidebar">
      <div className="sidebar-header onenote-pages-header">
        <button
          className="add-page-pill-btn"
          onClick={() => setIsAdding(true)}
          title="Add a new Page"
        >
          <Plus size={14} /> Add Page
        </button>

        <div className="header-actions">
          <button
            className="icon-button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            title="Search Pages"
          >
            <Search size={14} />
          </button>
          <button
            className="icon-button collapse-button"
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {showSearchInput && (
        <div className="page-search-bar">
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {isAdding && (
        <form className="page-add-form" onSubmit={handleAddSubmit}>
          <input
            type="text"
            placeholder="Page Title or Playlist URL..."
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            autoFocus
            disabled={isImporting}
          />
          <input
            type="url"
            placeholder="Optional YouTube Video/Playlist Link..."
            value={newPageVideoUrl}
            onChange={(e) => setNewPageVideoUrl(e.target.value)}
            disabled={isImporting}
          />
          <div className="form-buttons">
            <button type="submit" className="btn primary-btn" disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Create Page'}
            </button>
            <button
              type="button"
              className="btn cancel-btn"
              onClick={() => setIsAdding(false)}
              disabled={isImporting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="sidebar-list">
        {filteredPages.length === 0 ? (
          <div className="empty-state">No pages match. Click + Add Page to create one!</div>
        ) : (
          filteredPages.map((page) => {
            const isActive = page.id === activePageId;
            const isEditing = editingId === page.id;
            const hasValidVideo = hasValidYouTubeVideo(page.video_url);
            const thumbnail = hasValidVideo ? getYouTubeThumbnail(page.video_url) : null;
            const hasNotes = Boolean(page.note_filename);

            if (isEditing) {
              return (
                <form
                  key={page.id}
                  className="inline-form"
                  onSubmit={(e) => handleRenameSubmit(page.id, e)}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="action-btn success">
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="action-btn cancel"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={14} />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={page.id}
                className={`sidebar-item onenote-page-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectPage(page.id)}
              >
                {thumbnail ? (
                  <div className="page-thumbnail-box">
                    <img src={thumbnail} alt="Video preview" className="page-thumbnail" />
                    <span className="video-badge" title="Has YouTube Video">
                      <Video size={10} />
                    </span>
                  </div>
                ) : null}

                <div className="item-content">
                  <span className="item-title">{page.title}</span>
                  <div className="item-meta">
                    {hasValidVideo && <span className="meta-badge video">Video</span>}
                    {hasNotes && (
                      <span className="meta-badge notes">
                        <FileCode size={9} /> Note File
                      </span>
                    )}
                  </div>
                </div>

                <div className="item-controls">
                  <button
                    className="item-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(page.id);
                      setEditTitle(page.title);
                    }}
                    title="Rename Page"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="item-btn delete"
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
          })
        )}
      </div>
    </aside>
  );
}
