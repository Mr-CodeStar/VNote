import React, { useState } from 'react';
import { User, Settings, Video, VideoOff, Edit3, Link, Sparkles, Folder, FileText, Sun, Moon, Maximize2 } from 'lucide-react';
import { hasValidYouTubeVideo } from '../utils/youtube';
import * as api from '../services/api';

export default function WorkspaceHeader({
  activeBook,
  activePage,
  onOpenVideoModal,
  onRemoveVideo,
  onSavePageTitle,
  theme,
  onToggleTheme
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(activePage?.title || '');
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSetApiKey = async () => {
    const currentKey = localStorage.getItem('gemini_api_key') || '';
    const newKey = window.prompt('Enter your Gemini API Key:', currentKey);
    if (newKey !== null) {
      const trimmed = newKey.trim();
      localStorage.setItem('gemini_api_key', trimmed);
      try {
        await api.saveSetting('gemini_api_key', trimmed);
      } catch (e) {
        console.warn('Could not save setting to database:', e);
      }
      alert('API Key saved to database successfully!');
    }
    setShowProfileMenu(false);
  };

  if (!activePage) return null;

  const hasVideo = hasValidYouTubeVideo(activePage?.video_url);

  // Format creation timestamp
  const dateObj = activePage.created_at ? new Date(activePage.created_at) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText !== activePage.title) {
      onSavePageTitle(titleText.trim());
    } else {
      setTitleText(activePage.title);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleBlur();
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleText(activePage.title);
    }
  };

  return (
    <header className="workspace-header onenote-header">
      <div className="header-breadcrumbs">
        <span className="crumb-item">
          <Folder size={12} /> {activeBook?.name || 'Notebook'}
        </span>
        <span className="crumb-separator">/</span>
        <span className="crumb-item active">
          <FileText size={12} /> {activePage.title}
        </span>
      </div>

      <div className="header-main-row">
        <div className="title-container">
          {isEditingTitle ? (
            <input
              type="text"
              className="title-edit-input"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <div className="title-with-subtitle">
              <h1
                className="page-main-title"
                onClick={() => {
                  setTitleText(activePage.title);
                  setIsEditingTitle(true);
                }}
                title="Click to rename page"
              >
                {activePage.title}
                <Edit3 size={14} className="title-edit-hint" />
              </h1>
              <div className="page-datetime-subtitle">
                <span>{dateStr}</span>
                <span className="time-spacer">{timeStr}</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-top-right-actions">
          {/* LIGHT / DARK MODE TOGGLE BUTTON */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* USER PROFILE BUTTON */}
          <div className="video-circular-button-wrapper">
            <button
              className="theme-toggle-btn"
              style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px' }}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="User Profile"
            >
              <User size={15} />
            </button>
            {showProfileMenu && (
              <div className="video-dropdown-menu" style={{ right: 0, top: '100%' }}>
                <div className="menu-header">Profile Options</div>
                <button
                  className="menu-option"
                  onClick={handleSetApiKey}
                >
                  <Settings size={14} /> Set Gemini API Key
                </button>
              </div>
            )}
          </div>

          {/* COMPACT TOP-RIGHT CIRCULAR VIDEO BUTTON */}
          <div className="video-circular-button-wrapper">
            {!hasVideo ? (
              <button
                className="circular-btn add-video-btn"
                onClick={onOpenVideoModal}
                title="Upload / Attach YouTube Video"
              >
                <Video size={15} />
              </button>
            ) : (
              <div className="video-menu-container">
                <button
                  className="circular-btn active-video-btn"
                  onClick={() => setShowVideoMenu(!showVideoMenu)}
                  title="Video Options (Click to Edit / Remove)"
                >
                  <Sparkles size={12} className="sparkle-icon" />
                  <Video size={14} />
                </button>

                {showVideoMenu && (
                  <div className="video-dropdown-menu">
                    <div className="menu-header">Video Options</div>
                    <button
                      className="menu-option"
                      onClick={() => {
                        setShowVideoMenu(false);
                        onOpenVideoModal();
                      }}
                    >
                      <Link size={14} /> Change Video Link
                    </button>
                    <button
                      className="menu-option danger"
                      onClick={() => {
                        setShowVideoMenu(false);
                        if (confirm('Remove video from this page? Notes will shift to top.')) {
                          onRemoveVideo();
                        }
                      }}
                    >
                      <VideoOff size={14} /> Remove Video
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
