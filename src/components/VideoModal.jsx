import React, { useState, useEffect, useRef } from 'react';
import { Video, X, Link2, Play, Check, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { extractYouTubeId, hasValidYouTubeVideo, getYouTubeThumbnail } from '../utils/youtube';

const SAMPLE_VIDEO_URL = 'https://www.youtube.com/watch?v=gQTRsZpqrvg';

export default function VideoModal({
  isOpen,
  initialUrl,
  onClose,
  onSave
}) {
  const [url, setUrl] = useState(initialUrl || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setUrl(initialUrl || '');
    setError('');
  }, [initialUrl, isOpen]);

  // Focus input and handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedUrl = url.trim();
  const isValid = Boolean(trimmedUrl && hasValidYouTubeVideo(trimmedUrl));
  const videoId = isValid ? extractYouTubeId(trimmedUrl) : null;
  const thumbnail = isValid ? getYouTubeThumbnail(trimmedUrl) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmedUrl) {
      onSave(null);
      onClose();
      return;
    }

    if (!hasValidYouTubeVideo(trimmedUrl)) {
      setError('Please enter a valid YouTube video link (e.g. youtube.com/watch?v=... or youtu.be/...)');
      return;
    }

    setError('');
    onSave(trimmedUrl);
    onClose();
  };

  const handlePasteSample = () => {
    setUrl(SAMPLE_VIDEO_URL);
    setError('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleClearUrl = () => {
    setUrl('');
    setError('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleRemoveExistingVideo = () => {
    onSave(null);
    onClose();
  };

  return (
    <div className="vnote-modal-overlay" onClick={onClose}>
      <div
        className="vnote-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-modal-heading"
      >
        {/* Header */}
        <div className="vnote-modal-header">
          <div className="modal-header-brand">
            <div className="modal-icon-badge">
              <Video size={18} />
            </div>
            <div>
              <h3 id="video-modal-heading" className="modal-heading-text">
                {initialUrl ? 'Change YouTube Video' : 'Attach YouTube Video'}
              </h3>
              <p className="modal-subheading-text">
                Embed a video to enable synchronized keyframes, live timestamps, and notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-x-close-btn"
            onClick={onClose}
            title="Close dialog (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="vnote-modal-form">
          <div className="modal-field-container">
            <label htmlFor="yt-url-input" className="modal-input-label">
              YouTube Video URL
            </label>
            <div className={`modal-input-wrapper ${error ? 'has-error' : isValid ? 'is-valid' : ''}`}>
              <Link2 size={16} className="modal-input-lead-icon" />
              <input
                ref={inputRef}
                id="yt-url-input"
                type="text"
                className="modal-text-input"
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="off"
                spellCheck="false"
              />
              {url && (
                <button
                  type="button"
                  className="modal-input-clear-btn"
                  onClick={handleClearUrl}
                  title="Clear input"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {error && (
              <div className="modal-error-notice">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Sample Link helper */}
            {!url && (
              <div className="modal-sample-hint">
                <span>Want to test?</span>
                <button
                  type="button"
                  className="sample-link-btn"
                  onClick={handlePasteSample}
                >
                  Load FastAPI Tutorial Sample Video
                </button>
              </div>
            )}

            {/* Live Video Preview Box */}
            {isValid && (
              <div className="modal-video-preview-card">
                <div className="preview-thumb-wrap">
                  <img
                    src={thumbnail}
                    alt="YouTube Video Thumbnail"
                    className="preview-thumb-img"
                  />
                  <div className="preview-play-badge">
                    <Play size={12} fill="white" />
                  </div>
                </div>
                <div className="preview-info-col">
                  <div className="preview-status-pill">
                    <Check size={12} />
                    <span>Valid YouTube Video</span>
                  </div>
                  <span className="preview-vid-id">ID: {videoId}</span>
                  <a
                    href={trimmedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="preview-open-link"
                  >
                    <span>Open on YouTube</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="vnote-modal-footer">
            <div className="footer-left-actions">
              {initialUrl && (
                <button
                  type="button"
                  className="modal-danger-btn"
                  onClick={handleRemoveExistingVideo}
                  title="Detach video from this page"
                >
                  <Trash2 size={14} />
                  <span>Remove Video</span>
                </button>
              )}
            </div>

            <div className="footer-right-actions">
              <button
                type="button"
                className="modal-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modal-btn-primary"
                disabled={Boolean(url.trim() && !isValid)}
              >
                <Play size={14} fill="currentColor" />
                <span>Save & Embed Video</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
