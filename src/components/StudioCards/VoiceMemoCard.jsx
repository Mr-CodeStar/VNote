import React, { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  Clock,
  MoreHorizontal,
  Play,
  Pause,
  ShieldCheck,
  Mic,
  RotateCcw,
  Sparkles,
  X
} from 'lucide-react';
import { formatTime } from '../../utils/youtube';

const WAVE_BARS = [
  8, 14, 22, 28, 16, 26, 32, 24, 18, 10, 14, 20, 28, 30, 22, 16, 12, 18, 26, 32,
  20, 15, 22, 28, 24, 16, 12, 18, 25, 30, 18, 12, 8, 14, 20, 16, 10, 6
];

// Calculate realistic speech duration from text (~2.2 words per second)
const calculateDurationFromText = (text, fallback = 48) => {
  if (!text) return fallback;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return fallback;
  return Math.max(1, Math.ceil(words / 2.2));
};

// Format seconds into MM:SS format
const formatCounter = (secs) => {
  const s = Math.max(0, Math.round(secs));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m < 10 ? '0' : ''}${m}:${rem < 10 ? '0' : ''}${rem}`;
};

export default function VoiceMemoCard({
  timestamp = 525, // 08:45
  duration,
  confidence = '98.4%',
  transcriptText,
  onTranscriptChange,
  isRecordingExternal = false,
  onSeekVideo,
  onClose,
  cardRef
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioSecs, setCurrentAudioSecs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(transcriptText);

  // Dynamic duration reflecting real speech length
  const [memoDuration, setMemoDuration] = useState(() => {
    if (duration && duration !== 48) return duration;
    return calculateDurationFromText(transcriptText, 48);
  });

  // Sync when transcript or external duration prop changes
  useEffect(() => {
    if (transcriptText !== undefined && transcriptText !== null) {
      setTranscript(transcriptText);
      const computed = (duration && duration !== 48)
        ? duration
        : calculateDurationFromText(transcriptText, 48);
      setMemoDuration(computed);
      setCurrentAudioSecs(0);
      setIsPlaying(false);
    }
  }, [transcriptText, duration]);

  const recordStartTimeRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const intervalRef = useRef(null);

  // Audio playback timer and Speech Synthesis
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentAudioSecs((prev) => {
          if (prev >= memoDuration) {
            setIsPlaying(false);
            return memoDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, memoDuration]);

  // Toggle playback of the voice memo
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      setIsPlaying(true);
      setCurrentAudioSecs(0);

      // Use browser SpeechSynthesis to actually speak the user's memo
      if ('speechSynthesis' in window && transcript) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(transcript);
        utterance.rate = 1.0;
        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentAudioSecs(memoDuration);
        };
        utterance.onerror = () => {
          setIsPlaying(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Web Speech API for recording voice memo with real-time duration tracking
  const toggleRecord = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          recordStartTimeRef.current = Date.now();
          setCurrentAudioSecs(0);

          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = setInterval(() => {
            if (recordStartTimeRef.current) {
              const elapsed = Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000));
              setMemoDuration(elapsed);
              setCurrentAudioSecs(elapsed);
            }
          }, 300);
        };

        recognition.onresult = (event) => {
          let fullStr = '';
          for (let i = 0; i < event.results.length; i++) {
            fullStr += event.results[i][0].transcript + ' ';
          }
          if (fullStr.trim()) {
            const text = fullStr.trim();
            setTranscript(text);
            const elapsed = recordStartTimeRef.current
              ? Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000))
              : calculateDurationFromText(text, 2);
            setMemoDuration(elapsed);
            onTranscriptChange && onTranscriptChange(text, elapsed);
          }
        };

        recognition.onerror = () => {
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          setIsRecording(false);
        };

        recognition.onend = () => {
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          setIsRecording(false);
          if (recordStartTimeRef.current) {
            const elapsed = Math.max(1, Math.round((Date.now() - recordStartTimeRef.current) / 1000));
            setMemoDuration(elapsed);
            setCurrentAudioSecs(0);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const handleTimestampClick = () => {
    if (onSeekVideo) onSeekVideo(timestamp);
  };

  const audioProgressPercent = memoDuration > 0 ? (currentAudioSecs / memoDuration) * 100 : 0;
  const activeBarsCount = Math.floor((audioProgressPercent / 100) * WAVE_BARS.length);

  return (
    <div className="canvas-card voice-memo-card" ref={cardRef} id="canvas-card-voicememo">
      {/* 1. Header Bar */}
      <div className="card-header-bar">
        <div className="card-header-left">
          <GripVertical size={16} className="card-drag-handle" />
          <button
            className="card-timestamp-pill"
            onClick={handleTimestampClick}
            title="Click to jump video to timestamp"
          >
            <Clock size={12} />
            <span>{typeof timestamp === 'number' ? formatTime(timestamp) : timestamp}</span>
          </button>
          <span className="badge-pill voice-memo-transcript-badge">
            VOICE MEMO TRANSCRIPT
          </span>
        </div>

        <div className="card-header-right">
          <span className="duration-label">
            {formatCounter(memoDuration)} duration
          </span>
          {onClose && (
            <button
              className="card-header-icon-btn close-action"
              onClick={onClose}
              title="Delete Voice Memo Card"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Content Body */}
      <div className="card-inner-body">
        {/* Audio Player Strip */}
        <div className="voice-audio-player-strip">
          <button
            className={`audio-play-circle-btn ${isPlaying ? 'playing' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Audio' : 'Play Voice Memo'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
          </button>

          {/* Animated Waveform Display */}
          <div className="audio-waveform-container">
            {WAVE_BARS.map((height, i) => {
              const isActive = i <= activeBarsCount;
              return (
                <span
                  key={i}
                  className={`waveform-bar ${isActive ? 'active-green' : 'inactive-gray'} ${
                    isPlaying ? 'dancing' : ''
                  }`}
                  style={{
                    height: `${height}px`,
                    animationDelay: `${(i % 5) * 0.15}s`
                  }}
                />
              );
            })}
          </div>

          {/* Counter Display with Accurate Real Duration */}
          <div className="audio-counter-box">
            <span>{formatCounter(currentAudioSecs)}</span>
            <span className="counter-separator">/</span>
            <span>{formatCounter(memoDuration)}</span>
          </div>
        </div>

        {/* Voice Note STT Section */}
        <div className="whisper-stt-section">
          <div className="whisper-label-row">
            <span className="whisper-tag-live">
              {isRecording || isRecordingExternal ? '● LISTENING TO SPEECH...' : 'AUDIO MEMO TRANSCRIPT'}
            </span>
            <button
              className={`mic-record-small-btn ${isRecording || isRecordingExternal ? 'recording' : ''}`}
              onClick={toggleRecord}
              title={isRecording ? 'Stop Recording' : 'Record Voice Note (Speech to Text)'}
            >
              <Mic size={12} className={isRecording || isRecordingExternal ? 'mic-pulse' : ''} />
              <span>{isRecording || isRecordingExternal ? 'Recording...' : 'Record Voice'}</span>
            </button>
          </div>

          <blockquote className="whisper-quote-text">
            “{transcript || 'Speak or record a voice note to capture your thoughts here...'}”
          </blockquote>
        </div>

        {/* 3. Footer Strip: Confidence Rating */}
        <div className="confidence-footer-strip">
          <div className="confidence-pill">
            <ShieldCheck size={14} className="confidence-shield-icon" />
            <span className="confidence-text">Confidence {confidence}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
