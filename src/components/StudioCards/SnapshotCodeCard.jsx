import React, { useState, useEffect } from 'react';
import {
  GripVertical,
  Clock,
  Play,
  Edit2,
  X,
  ShieldCheck,
  Copy,
  Check,
  Tag,
  Code2
} from 'lucide-react';
import { formatTime } from '../../utils/youtube';

const DEFAULT_PYTHON_CODE = `from fastapi import FastAPI

app = FastAPI(title="Vnote API")

@app.get("/")
async def read_root():
    return {"status": "active", "engine": "ASGI"}`;

export default function SnapshotCodeCard({
  id = 'canvas-card-snapshot',
  timestamp = 0,
  title = 'Keyframe Snapshot',
  description = 'Synchronized keyframe snapshot captured from video.',
  imageSrc = '/fastapi_keyframe.jpg',
  code = '',
  tags = ['#keyframe'],
  syncStatus = 'Synced',
  onSeekVideo,
  onClose,
  onUpdate,
  cardRef
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [currentDesc, setCurrentDesc] = useState(description);
  const [currentCode, setCurrentCode] = useState(code);
  const [copied, setCopied] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setCurrentTitle(title);
    setCurrentDesc(description);
    setCurrentCode(code);
  }, [title, description, code]);

  const handleSaveEdit = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({
        title: currentTitle,
        description: currentDesc,
        code: currentCode
      });
    }
  };

  const handleCopyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTimestampClick = () => {
    if (onSeekVideo) onSeekVideo(timestamp);
  };

  return (
    <div className="canvas-card snapshot-code-card" ref={cardRef} id={id}>
      {/* 1. Header Bar */}
      <div className="card-header-bar">
        <div className="card-header-left">
          <GripVertical size={16} className="card-drag-handle" />
          <button
            className="card-timestamp-pill"
            onClick={handleTimestampClick}
            title="Click to jump video to 04:22"
          >
            <Clock size={12} />
            <span>{typeof timestamp === 'number' ? formatTime(timestamp) : timestamp}</span>
          </button>
          <span className="badge-pill snapshot-code-badge">SNAPSHOT & CODE</span>
        </div>

        <div className="card-header-right">
          <button
            className="card-header-icon-btn play-action"
            onClick={handleTimestampClick}
            title="Play from this timestamp"
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            className={`card-header-icon-btn ${isEditing ? 'active' : ''}`}
            onClick={() => {
              if (isEditing) {
                handleSaveEdit();
              } else {
                setIsEditing(true);
              }
            }}
            title={isEditing ? 'Save Changes' : 'Edit Title & Notes'}
          >
            {isEditing ? <Check size={13} className="check-green" /> : <Edit2 size={13} />}
          </button>
          <button
            className="card-header-icon-btn close-action"
            onClick={onClose}
            title="Close Card"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="card-inner-body">
        {/* Title & Description */}
        {isEditing ? (
          <div className="card-edit-inputs">
            <input
              type="text"
              className="card-edit-title-input"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              placeholder="Card Title..."
            />
            <textarea
              className="card-edit-desc-textarea"
              rows={2}
              value={currentDesc}
              onChange={(e) => setCurrentDesc(e.target.value)}
              placeholder="Lecture notes description..."
            />
          </div>
        ) : (
          <div className="card-text-summary">
            <h3 className="card-h3-title">{currentTitle}</h3>
            <p className="card-desc-paragraph">{currentDesc}</p>
          </div>
        )}

        {/* Synchronized Keyframe Image */}
        <div className="keyframe-snapshot-wrapper">
          <img
            src={imageSrc}
            alt="Synchronized lecture keyframe"
            className="keyframe-snapshot-img"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80';
            }}
          />
          <div className="keyframe-badge-overlay">
            <ShieldCheck size={13} className="shield-icon" />
            <span>Synchronized Keyframe</span>
          </div>
        </div>

        {/* Code Editor Snippet Block */}
        {(currentCode || isEditing) && (
          <div className="code-snippet-box">
            <div className="code-header-bar">
              <span className="code-file-name">notes.py</span>
              <div className="code-header-right-meta">
                <span className="code-lang-tag">Code / Note</span>
                <button
                  className="code-copy-btn"
                  onClick={handleCopyCode}
                  title="Copy code snippet"
                >
                  {copied ? <Check size={12} className="check-green" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="code-editor-area">
              {isEditing ? (
                <textarea
                  className="code-edit-textarea"
                  rows={4}
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  placeholder="# Enter code or key takeaways here..."
                />
              ) : (
                <pre className="code-syntax-display">
                  <code>{currentCode}</code>
                </pre>
              )}
            </div>
          </div>
        )}

        {/* 3. Footer Strip: Tags and Sync Time */}
        <div className="card-footer-strip">
          <div className="tags-pills-row">
            {tags.map((tag, i) => (
              <span key={i} className="tag-pill-badge">
                {tag}
              </span>
            ))}
          </div>
          <span className="synced-meta-text">{syncStatus}</span>
        </div>
      </div>
    </div>
  );
}
