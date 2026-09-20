import React, { useRef, useState, useEffect } from 'react';
import { getYouTubeEmbedUrl, extractYouTubeId, formatTime } from '../utils/youtube';
import { Play, Pause, Clock, Sparkles } from 'lucide-react';

export default function VideoPlayerSection({
  videoUrl,
  onInsertTimestamp
}) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const videoId = extractYouTubeId(videoUrl);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    // Load YouTube API script if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    let intervalId = null;

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
          videoId: videoId,
          playerVars: { enablejsapi: 1, rel: 0, autoplay: 0 },
          events: {
            onReady: () => {
              setIsPlayerReady(true);
              // Force iframe to be 100% width/height to match our CSS
              const iframe = document.getElementById(`yt-player-${videoId}`);
              if (iframe) {
                iframe.className = 'youtube-iframe';
                iframe.style.position = 'absolute';
                iframe.style.top = '0';
                iframe.style.left = '0';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
              }
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
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    // Interval to poll live timestamp
    intervalId = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const time = playerRef.current.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(Math.floor(time));
          }
        } catch (e) {
          // Ignore polling errors
        }
      }
    }, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
          // React Strict Mode workaround: recreate the div since destroy() removes it
          const container = document.getElementById(`yt-player-container-${videoId}`);
          if (container) {
            const div = document.createElement('div');
            div.id = `yt-player-${videoId}`;
            container.appendChild(div);
          }
        } catch (e) {}
      }
    };
  }, [videoId]);

  if (!embedUrl || !videoId) return null;

  const formattedLiveTime = formatTime(currentTime);

  const handleAddTimestampClick = () => {
    let liveSecs = currentTime;
    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      try {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          liveSecs = Math.floor(time);
        }
      } catch (e) {}
    }
    const formatted = formatTime(liveSecs);
    const stampText = `⏱️ Timestamp [${formatted}]: `;
    onInsertTimestamp(stampText);
  };

  return (
    <section className="video-player-container">
      <div className="video-wrapper" id={`yt-player-container-${videoId}`}>
        <div id={`yt-player-${videoId}`}></div>
      </div>

      <div className="video-toolbar">
        <div className="toolbar-left">
          <span className={`video-status-badge ${isPlaying ? 'playing' : 'paused'}`}>
            {isPlaying ? <Play size={13} className="play-icon" /> : <Pause size={13} />}
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
          <span className="live-clock-display">
            <Clock size={14} className="clock-icon" />
            Live Time: <strong>{formattedLiveTime}</strong>
          </span>
        </div>

        <div className="toolbar-right">
          <button
            className="stamp-btn"
            onClick={handleAddTimestampClick}
            title="Grab live timestamp and add note box to canvas"
          >
            <Clock size={14} /> Insert Live Timestamp [{formattedLiveTime}]
          </button>
        </div>
      </div>
    </section>
  );
}
