import React, { useState } from 'react';
import {
  GripVertical,
  Clock,
  RotateCw,
  CheckCircle2,
  Circle,
  Plus,
  ExternalLink,
  Edit2,
  X
} from 'lucide-react';
import { formatTime } from '../../utils/youtube';

const DEFAULT_MILESTONES = [
  {
    id: 1,
    checked: true,
    boldLabel: 'High Performance:',
    text: 'Benchmarks comparable to NodeJS and Go via Starlette.'
  },
  {
    id: 2,
    checked: true,
    boldLabel: 'Automatic OpenAPI Docs:',
    text: 'Out-of-the-box Swagger UI generation at /docs.'
  },
  {
    id: 3,
    checked: true,
    boldLabel: 'Pydantic Type Hints:',
    text: 'Full IDE auto-completion and data parsing at runtime.'
  }
];

export default function CourseOutlineCard({
  timestamp = 7, // 00:07
  title = 'Introduction & Key Milestones',
  instructorReference = 'Telusko Series 2026',
  onSeekVideo,
  onRegenerateOutline,
  onClose,
  cardRef
}) {
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES);
  const [newBoldLabel, setNewBoldLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleCheck = (id) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m))
    );
  };

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newBoldLabel.trim() && !newText.trim()) return;
    const newItem = {
      id: Date.now(),
      checked: true,
      boldLabel: newBoldLabel.trim() ? `${newBoldLabel.trim()}:` : '',
      text: newText.trim()
    };
    setMilestones((prev) => [...prev, newItem]);
    setNewBoldLabel('');
    setNewText('');
    setIsAdding(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRegenerateOutline) onRegenerateOutline();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleTimestampClick = () => {
    if (onSeekVideo) onSeekVideo(timestamp);
  };

  return (
    <div className="canvas-card course-outline-card" ref={cardRef} id="canvas-card-outline">
      {/* 1. Header Bar */}
      <div className="card-header-bar">
        <div className="card-header-left">
          <GripVertical size={16} className="card-drag-handle" />
          <button
            className="card-timestamp-pill"
            onClick={handleTimestampClick}
            title="Click to jump video to 00:07"
          >
            <Clock size={12} />
            <span>{typeof timestamp === 'number' ? formatTime(timestamp) : timestamp}</span>
          </button>
          <span className="badge-pill course-outline-badge">COURSE OUTLINE</span>
        </div>

        <div className="card-header-right">
          <button
            className={`card-header-icon-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Reload / AI Regenerate Milestones"
          >
            <RotateCw size={14} />
          </button>
          {onClose && (
            <button
              className="card-header-icon-btn close-action"
              onClick={onClose}
              title="Close Course Outline Card"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="card-inner-body">
        <h3 className="card-h3-title">{title}</h3>

        <div className="milestones-checklist">
          {milestones.map((item) => (
            <div
              key={item.id}
              className={`milestone-row ${item.checked ? 'completed' : ''}`}
              onClick={() => toggleCheck(item.id)}
            >
              <div className="check-icon-col">
                {item.checked ? (
                  <CheckCircle2 size={16} className="milestone-check-active" />
                ) : (
                  <Circle size={16} className="milestone-check-inactive" />
                )}
              </div>
              <div className="milestone-text-content">
                {item.boldLabel && <strong>{item.boldLabel} </strong>}
                <span>{item.text}</span>
              </div>
            </div>
          ))}

          {isAdding && (
            <form className="add-milestone-form" onSubmit={handleAddMilestone}>
              <input
                type="text"
                placeholder="Topic / Key Term (e.g. Async IO:)..."
                value={newBoldLabel}
                onChange={(e) => setNewBoldLabel(e.target.value)}
                autoFocus
              />
              <input
                type="text"
                placeholder="Description or milestone summary..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <div className="form-action-buttons">
                <button type="submit" className="mini-submit-btn">Add Item</button>
                <button type="button" className="mini-cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </form>
          )}

          {!isAdding && (
            <button
              className="add-milestone-ghost-btn"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={12} />
              <span>Add Milestone Item</span>
            </button>
          )}
        </div>

        {/* 3. Instructor Reference Strip */}
        <div className="instructor-reference-strip">
          <span className="reference-label">INSTRUCTOR REFERENCE</span>
          <a
            href="https://www.youtube.com/@Telusko"
            target="_blank"
            rel="noopener noreferrer"
            className="reference-link"
          >
            <span>{instructorReference}</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
}
