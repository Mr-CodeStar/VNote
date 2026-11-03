import React, { useState, useEffect, useRef } from 'react';
import ColorWheelPopover from './ColorWheelPopover';
import {
  Folder,
  MousePointer,
  Edit2,
  Highlighter,
  Eraser,
  RotateCcw,
  RotateCw,
  Minus,
  Plus,
  Sun,
  Moon,
  User,
  Key,
  Video,
  VideoOff,
  Link2,
  Check,
  ChevronDown
} from 'lucide-react';
import { hasValidYouTubeVideo } from '../utils/youtube';

const PALETTE_COLORS = [
  { name: 'Royal Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Dark Teal', value: '#0f766e' },
  { name: 'Crimson', value: '#ef4444' }
];

const STROKE_SIZE_PRESETS = [2, 4, 8, 14, 20];

export default function StudioHeader({
  activeBook,
  activePage,
  onSavePageTitle,
  theme,
  onToggleTheme,
  activeTool = 'select',
  onToolChange,
  color = '#3b82f6',
  onColorChange,
  lineWidth = 4,
  onLineWidthChange,
  zoom = 100,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onOpenVideoModal,
  onRemoveVideo,
  hasGeminiApiKey = false,
  onSaveApiKey,
  geminiApiKey = '',
  onOpenApiKeyModal
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(activePage?.title || '');
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorWheelPopover, setShowColorWheelPopover] = useState(false);

  const sizeMenuRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Keep title input in sync with active page
  useEffect(() => {
    setTitleText(activePage?.title || '');
  }, [activePage?.id, activePage?.title]);

  // Close size menu on click outside
  useEffect(() => {
    if (!showSizeMenu) return;
    const handleClickOutside = (e) => {
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target)) {
        setShowSizeMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showSizeMenu]);

  // Close profile menu on click outside
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showProfileMenu]);

  const hasVideo = hasValidYouTubeVideo(activePage?.video_url);

  const isCustomColor = !PALETTE_COLORS.some(
    (c) => c.value.toLowerCase() === (color || '').toLowerCase()
  );

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (activePage && titleText.trim() && titleText.trim() !== activePage.title) {
      onSavePageTitle(titleText.trim());
    } else {
      setTitleText(activePage?.title || '');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSubmit();
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleText(activePage?.title || '');
    }
  };

  const handleSetApiKey = () => {
    setShowProfileMenu(false);
    if (onOpenApiKeyModal) {
      onOpenApiKeyModal();
    }
  };

  return (
    <header className="studio-top-header">
      {/* 1. LEFT: Brand Logo & Dynamic Folder/Page Breadcrumb */}
      <div className="header-left-cluster">
        {/* Brand Monogram & Title */}
        <div className="studio-brand">
          <div className="brand-logo-icon">
            <img src="./vnote_logo.png" alt="VNote Logo" className="brand-app-logo-img" />
          </div>
          <span className="brand-name">Vnote</span>
          <span className="studio-pill-badge">STUDIO</span>
        </div>

        {/* Breadcrumb Navigation - completely dynamic with NO dummy defaults */}
        <div className="header-breadcrumbs">
          <Folder size={14} className="crumb-folder-icon" />
          <span className={`crumb-folder-name ${!activeBook ? 'muted' : ''}`}>
            {activeBook ? activeBook.name : 'No Folder'}
          </span>

          {activeBook && (
            <>
              <span className="crumb-slash">/</span>
              {isEditingTitle && activePage ? (
                <input
                  type="text"
                  className="breadcrumb-title-input"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              ) : (
                <span
                  className={`crumb-active-page ${!activePage ? 'muted' : ''}`}
                  onClick={() => {
                    if (activePage) {
                      setTitleText(activePage.title);
                      setIsEditingTitle(true);
                    }
                  }}
                  title={activePage ? 'Click to rename page' : 'No page selected'}
                >
                  {activePage ? activePage.title : 'No Page'}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. CENTER: Floating Canvas Toolbar Pill */}
      <div className="header-center-toolbar">
        <div className="floating-canvas-pill">
          {/* Select Tool */}
          <button
            className={`toolbar-pill-btn ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onToolChange('select')}
            title="Select Tool (Click and drag cards or text boxes) [V]"
          >
            <MousePointer size={15} />
          </button>

          {/* Pen Tool */}
          <button
            className={`toolbar-pill-btn ${activeTool === 'pen' ? 'active' : ''}`}
            onClick={() => onToolChange(activeTool === 'pen' ? 'select' : 'pen')}
            title="Pen Tool (Draw freehand on canvas) [P]"
          >
            <Edit2 size={15} />
          </button>

          {/* Highlighter Tool */}
          <button
            className={`toolbar-pill-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => onToolChange(activeTool === 'highlighter' ? 'select' : 'highlighter')}
            title="Highlighter Tool (Highlight concepts on canvas)"
          >
            <Highlighter size={15} />
          </button>

          {/* Eraser Tool */}
          <button
            className={`toolbar-pill-btn ${activeTool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange(activeTool === 'eraser' ? 'select' : 'eraser')}
            title="Eraser Tool (Erase drawing strokes) [E]"
          >
            <Eraser size={15} />
          </button>

          <div className="pill-divider" />

          {/* Color Swatch Dots & Custom Color Wheel */}
          <div className="palette-dots-cluster">
            {PALETTE_COLORS.map((c) => {
              const isSelected = color.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  className={`palette-dot-btn ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => onColorChange(c.value)}
                  title={c.name}
                  aria-label={c.name}
                />
              );
            })}

            {/* Custom Chromatic Color Wheel Anchor */}
            <div className="color-wheel-anchor-wrapper">
              <button
                type="button"
                className={`color-wheel-anchor-trigger ${isCustomColor ? 'custom-active' : ''} ${showColorWheelPopover ? 'open' : ''}`}
                onClick={() => setShowColorWheelPopover(!showColorWheelPopover)}
                title={`Color Studio & Wheel (${color}) - Click for full palette & wheel`}
                aria-label="Color Wheel custom color picker"
              >
                <div className="color-wheel-lens">
                  <div className="color-wheel-spectrum" />
                  {isCustomColor && (
                    <span
                      className="color-wheel-custom-dot"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </div>
              </button>

              {/* Color Wheel Popover Card */}
              <ColorWheelPopover
                isOpen={showColorWheelPopover}
                onClose={() => setShowColorWheelPopover(false)}
                color={color}
                onColorChange={onColorChange}
              />
            </div>
          </div>

          {/* Pen / Stroke Size Selector */}
          <div className="pen-size-selector-anchor" ref={sizeMenuRef}>
            <button
              type="button"
              className={`pen-size-trigger-btn ${showSizeMenu ? 'active' : ''}`}
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              title={`Pen Size: ${lineWidth}px (Use [ or ] to adjust size)`}
            >
              <span
                className="pen-size-indicator-circle"
                style={{
                  width: `${Math.min(14, Math.max(4, lineWidth))}px`,
                  height: `${Math.min(14, Math.max(4, lineWidth))}px`,
                  backgroundColor: color
                }}
              />
              <span className="pen-size-label">{lineWidth}px</span>
              <ChevronDown size={11} className={`pen-size-chevron ${showSizeMenu ? 'open' : ''}`} />
            </button>

            {/* Popover for stroke size */}
            {showSizeMenu && (
              <div className="pen-size-popover-card">
                <div className="pen-size-popover-header">
                  <span className="popover-title">Stroke Size</span>
                  <span className="popover-hint">[ / ]</span>
                </div>

                <div className="pen-size-presets-grid">
                  {STROKE_SIZE_PRESETS.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`pen-preset-chip ${lineWidth === sz ? 'selected' : ''}`}
                      onClick={() => {
                        onLineWidthChange && onLineWidthChange(sz);
                      }}
                      title={`${sz}px stroke thickness`}
                    >
                      <span
                        className="preset-dot"
                        style={{
                          width: `${Math.min(18, Math.max(4, sz))}px`,
                          height: `${Math.min(18, Math.max(4, sz))}px`,
                          backgroundColor: color
                        }}
                      />
                      <span>{sz}px</span>
                    </button>
                  ))}
                </div>

                <div className="pen-size-slider-box">
                  <input
                    type="range"
                    min="1"
                    max="28"
                    value={lineWidth}
                    onChange={(e) => onLineWidthChange && onLineWidthChange(Number(e.target.value))}
                    className="pen-slider-input"
                  />
                  <span className="slider-value-display">{lineWidth}px</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. RIGHT: Undo, Redo, Zoom, Video Button, Theme Toggle, User Avatar */}
      <div className="header-right-cluster">
        {/* Undo & Redo (with active shortcuts hint) */}
        <div className="undo-redo-group">
          <button className="icon-action-btn" onClick={onUndo} title="Undo Stroke / Note (Ctrl+Z)">
            <RotateCcw size={14} />
          </button>
          <button className="icon-action-btn" onClick={onRedo} title="Redo (Ctrl+Y or Ctrl+Shift+Z)">
            <RotateCw size={14} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-control-group">
          <button className="zoom-btn" onClick={onZoomOut} title="Zoom Out (Ctrl+ -)">
            <Minus size={13} />
          </button>
          <span className="zoom-value">{zoom}%</span>
          <button className="zoom-btn" onClick={onZoomIn} title="Zoom In (Ctrl+ +)">
            <Plus size={13} />
          </button>
        </div>

        {/* PROMINENT VIDEO BUTTON: Add / Change / Remove Video for this page */}
        <div className="video-header-control-wrapper">
          {!hasVideo ? (
            <button
              className="header-add-video-pill-btn"
              onClick={onOpenVideoModal}
              title="Add a YouTube video to this page"
            >
              <Video size={14} />
              <span>Add Video</span>
            </button>
          ) : (
            <div className="video-menu-anchor">
              <button
                className="header-active-video-pill-btn"
                onClick={() => setShowVideoMenu(!showVideoMenu)}
                title="Video attached. Click for options"
              >
                <Video size={14} />
                <span>Video Options</span>
              </button>

              {showVideoMenu && (
                <div className="header-video-dropdown">
                  <button
                    className="video-drop-item"
                    onClick={() => {
                      setShowVideoMenu(false);
                      onOpenVideoModal();
                    }}
                  >
                    <Link2 size={13} />
                    <span>Change Video URL</span>
                  </button>
                  <button
                    className="video-drop-item danger"
                    onClick={() => {
                      setShowVideoMenu(false);
                      if (confirm('Remove video from this page?')) {
                        onRemoveVideo();
                      }
                    }}
                  >
                    <VideoOff size={13} />
                    <span>Remove Video</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          className="theme-toggle-round-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Profile Avatar with Dropdown */}
        <div className="user-profile-wrapper">
          <button
            className="user-avatar-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="User Profile & API Key"
          >
            <User size={16} />
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown-menu" ref={profileMenuRef}>
              <div className="menu-header-info">
                <strong>Workspace Profile</strong>
                <span>Active Page: {activePage?.title || 'None'}</span>
              </div>
              
              <div className={`profile-api-status-badge ${hasGeminiApiKey ? 'configured' : 'missing'}`}>
                {hasGeminiApiKey ? (
                  <>
                    <Check size={12} className="icon-green" />
                    <span>Gemini API: Connected</span>
                  </>
                ) : (
                  <>
                    <Key size={12} />
                    <span>Gemini API: Not Configured</span>
                  </>
                )}
              </div>

              <div className="dropdown-separator" />
              <button className="dropdown-item" onClick={handleSetApiKey}>
                <Key size={14} />
                <span>{hasGeminiApiKey ? 'Update Gemini API Key' : 'Set Gemini API Key'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
