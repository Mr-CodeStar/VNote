import React, { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  Maximize2,
  MoreVertical,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Plus,
  Camera,
  PictureInPicture2,
  Video,
  Link2,
  VideoOff
} from 'lucide-react';
import { extractYouTubeId, formatTime, hasValidYouTubeVideo } from '../../utils/youtube';

export default function VideoStreamCard({
  videoUrl,
  pageTitle = 'FastAPI for Beginners',
  onInsertLiveTimestamp,
  onCaptureFrame,
  onSeekVideo,
  externalSeekTime,
  isPausedWhileTyping,
  onTogglePauseWhileTyping,
  onOpenVideoModal,
  onRemoveVideo,
  cardRef
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1458);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const hasVideo = hasValidYouTubeVideo(videoUrl);
  const videoId = hasVideo ? extractYouTubeId(videoUrl) : null;
  const playerRef = useRef(null);
  const ytContainerRef = useRef(null);

  // Initialize YouTube Iframe API if valid video
  useEffect(() => {
    if (!videoId || !ytContainerRef.current) return;

    // Reset container contents imperatively so React VDOM is never out-of-sync
    ytContainerRef.current.innerHTML = '';
    const mountEl = document.createElement('div');
    mountEl.id = `yt-stream-player-${videoId}`;
    ytContainerRef.current.appendChild(mountEl);

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    let intervalId = null;

    const initPlayer = () => {
      if (window.YT && window.YT.Player && mountEl) {
        try {
          playerRef.current = new window.YT.Player(mountEl, {
            videoId: videoId,
            playerVars: {
              enablejsapi: 1,
              rel: 0,
              autoplay: 0,
              modestbranding: 1,
              controls: 0,
              fs: 0,
              iv_load_policy: 3
            },
            events: {
              onReady: (event) => {
                try {
                  const total = event.target.getDuration();
                  if (total && !isNaN(total)) setDuration(Math.floor(total));
                } catch (e) {}
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                } else {
                  setIsPlaying(false);
                }
              }
            }
          });
        } catch (e) {
          console.error('Error creating YT.Player:', e);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    intervalId = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(Math.floor(time));
          }
        } catch (e) {}
      }
    }, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = '';
      }
    };
  }, [videoId]);

  // Handle external seek triggers (e.g. from clicking timestamp badge on another card)
  useEffect(() => {
    if (externalSeekTime !== null && externalSeekTime !== undefined) {
      setCurrentTime(externalSeekTime);
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try {
          playerRef.current.seekTo(externalSeekTime, true);
          playerRef.current.playVideo();
        } catch (e) {}
      }
    }
  }, [externalSeekTime]);

  const togglePlay = () => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } catch (e) {
        setIsPlaying(!isPlaying);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSkip = (seconds) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    setCurrentTime(target);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(target, true);
      } catch (e) {}
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(speed);
      } catch (e) {}
    }
  };

  const handleScrubberChange = (e) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(val, true);
      } catch (e) {}
    }
  };

  const handleInsertTimestampClick = () => {
    let liveSecs = currentTime;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          liveSecs = Math.floor(time);
        }
      } catch (e) {}
    }
    if (onInsertLiveTimestamp) {
      onInsertLiveTimestamp(liveSecs);
    }
  };

  const handleCaptureFrameClick = () => {
    let liveSecs = currentTime;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          liveSecs = Math.floor(time);
        }
      } catch (e) {}
    }
    if (onCaptureFrame) {
      onCaptureFrame(liveSecs);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="canvas-card video-stream-card" ref={cardRef} id="canvas-card-video">
      {/* 1. Header Bar */}
      <div className="card-header-bar">
        <div className="card-header-left">
          <GripVertical size={16} className="card-drag-handle" />
          <span className="badge-pill video-stream-badge">VIDEO STREAM</span>
          <h2 className="card-title-text" title={pageTitle}>
            {pageTitle || 'Lecture Video'}
          </h2>
        </div>

        <div className="card-header-right">
          {/* Prominent Add/Change Video Button */}
          <button
            className="card-change-video-btn"
            onClick={onOpenVideoModal}
            title={hasVideo ? "Change YouTube Video URL" : "Attach YouTube Video"}
          >
            <Video size={13} />
            <span>{hasVideo ? 'Change Video' : '+ Add Video'}</span>
          </button>

          {hasVideo && (
            <button
              className="card-header-icon-btn danger"
              onClick={() => {
                if (confirm('Remove video from this page?')) {
                  onRemoveVideo && onRemoveVideo();
                }
              }}
              title="Remove Video"
            >
              <VideoOff size={13} />
            </button>
          )}

          <button
            className="card-header-icon-btn"
            onClick={() => {
              const el = document.getElementById(`yt-player-container-${videoId}`);
              if (el && el.requestFullscreen) el.requestFullscreen();
            }}
            title="Fullscreen Video"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* 2. Video Player Frame Container */}
      {!hasVideo ? (
        <div className="no-video-attached-placeholder">
          <div className="no-video-inner">
            <Video size={42} className="no-video-big-icon" />
            <h3>No Video Attached</h3>
            <p>Connect a YouTube video to this page to watch, take live timestamped notes, and capture keyframes.</p>
            <button className="attach-video-cta-btn" onClick={onOpenVideoModal}>
              <Plus size={15} />
              <span>Attach YouTube Video</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="video-player-display-frame">
          {/* YouTube Video Target - Pure container managed by imperative ref, empty in React JSX */}
          <div
            className="yt-iframe-container"
            id={`yt-player-container-${videoId}`}
            ref={ytContainerRef}
          />

          {/* Custom Bottom Scrubber Bar */}
          <div className="custom-scrubber-overlay-bar">
            <div className="scrubber-left-controls">
              <button className="scrub-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              </button>
              <button className="scrub-btn" onClick={() => handleSkip(-10)} title="Replay 10s">
                <RotateCcw size={13} />
                <span className="skip-num">10</span>
              </button>
              <button className="scrub-btn" onClick={() => handleSkip(10)} title="Forward 10s">
                <RotateCw size={13} />
                <span className="skip-num">10</span>
              </button>
              <span className="timestamp-counter-text">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Progress Timeline Slider */}
            <div className="scrubber-timeline-track">
              <div className="timeline-filled-bar" style={{ width: `${progressPercent}%` }} />
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleScrubberChange}
                className="timeline-range-input"
              />
              <span className="scrubber-dot-handle" style={{ left: `${progressPercent}%` }} />
            </div>

            <div className="scrubber-right-controls">
              <div className="speed-pills-row">
                {[1, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    className={`speed-pill ${playbackSpeed === s ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                className="scrub-btn"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Action Strip below player */}
      <div className="video-card-bottom-actions">
        <div className="action-buttons-group">
          <button
            className="insert-live-stamp-btn"
            onClick={handleInsertTimestampClick}
            title="Grab live video timestamp and create note"
          >
            <Plus size={14} />
            <span>Insert Live Timestamp</span>
            <span className="stamp-box-tag">{formatTime(currentTime)}</span>
          </button>

          <button
            className="capture-frame-btn"
            onClick={handleCaptureFrameClick}
            title="Capture current video frame timestamp"
          >
            <Camera size={14} />
            <span>Capture Frame</span>
          </button>
        </div>

        <div className="pause-typing-switch-container">
          <label className="toggle-switch-label">
            <input
              type="checkbox"
              checked={isPausedWhileTyping}
              onChange={onTogglePauseWhileTyping}
            />
            <span className="toggle-slider-round" />
            <span className="toggle-text">Pause while typing</span>
          </label>
        </div>
      </div>
    </div>
  );
}
