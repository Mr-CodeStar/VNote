import React, { useState } from 'react';
import { Video, X, Link, Play } from 'lucide-react';

export default function VideoModal({
  isOpen,
  initialUrl,
  onClose,
  onSave
}) {
  const [url, setUrl] = useState(initialUrl || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(url.trim() || null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Video className="modal-icon" size={20} />
            <h3>Attach YouTube Topic Video</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="modal-label">YouTube Video URL:</label>
            <div className="input-with-icon">
              <Link size={16} className="input-icon" />
              <input
                type="url"
                className="modal-url-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <p className="modal-help-text">
              Paste any standard YouTube link, short link (youtu.be), or embed URL. The player will render at the top of your page.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary-btn">
              <Play size={16} /> Save & Embed Video
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
