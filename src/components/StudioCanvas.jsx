import React, { useState, useRef, useEffect, useCallback } from 'react';
import VideoStreamCard from './StudioCards/VideoStreamCard';
import SnapshotCodeCard from './StudioCards/SnapshotCodeCard';
import CourseOutlineCard from './StudioCards/CourseOutlineCard';
import VoiceMemoCard from './StudioCards/VoiceMemoCard';
import DrawingLayer from './NoteCanvas/DrawingLayer';
import TextBoxLayer from './NoteCanvas/TextBoxLayer';
import VideoAiChatWindow from './VideoAiChatWindow';
import {
  MousePointer,
  Hand,
  CornerDownRight,
  ArrowRight,
  StickyNote,
  Camera,
  Mic,
  RotateCcw,
  Maximize2,
  Sparkles,
  Bot,
  Key,
  Video
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { formatTime, hasValidYouTubeVideo, extractYouTubeId } from '../utils/youtube';

export default function StudioCanvas({
  activePage,
  activeBook,
  activeTool = 'select',
  onToolChange,
  color = '#3b82f6',
  lineWidth = 4,
  zoom = 100,
  onResetZoom,
  initialNoteData,
  onSaveNotes,
  isSaving,
  onOpenVideoModal,
  onRemoveVideo,
  undoTrigger,
  redoTrigger,
  hasGeminiApiKey = false,
  geminiApiKey = '',
  onPromptSetApiKey
}) {
  const [videoSeekTimestamp, setVideoSeekTimestamp] = useState(null);
  const [isPausedWhileTyping, setIsPausedWhileTyping] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // Dynamic user-added notes & strokes
  const [textNodes, setTextNodes] = useState(initialNoteData?.textNodes || []);
  const [strokes, setStrokes] = useState(initialNoteData?.strokes || []);
  const [activeFocusedNodeId, setActiveFocusedNodeId] = useState(null);

  // Dynamic cards state - each page starts completely clean unless populated
  const [voiceTranscript, setVoiceTranscript] = useState(initialNoteData?.voiceTranscript || null);
  const [voiceDuration, setVoiceDuration] = useState(() => {
    if (initialNoteData?.voiceDuration) return initialNoteData.voiceDuration;
    if (initialNoteData?.voiceTranscript) {
      const words = initialNoteData.voiceTranscript.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(1, Math.ceil(words / 2.2));
    }
    return 0;
  });
  const [snapshots, setSnapshots] = useState(initialNoteData?.snapshots || []);
  const [outlineData, setOutlineData] = useState(initialNoteData?.outlineData || null);

  // Voice recording state
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const voiceStartTimeRef = useRef(null);
  const recognitionRef = useRef(null);

  // Undo / Redo history stacks
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  // Card presence checks
  const hasVideo = hasValidYouTubeVideo(activePage?.video_url);
  const hasAnyCards = hasVideo || (snapshots && snapshots.length > 0) || Boolean(voiceTranscript) || Boolean(outlineData);
  const isPageCompletelyEmpty = !hasAnyCards && textNodes.length === 0 && strokes.length === 0;

  // Refs for each card to support minimap scrolling
  const videoCardRef = useRef(null);
  const snapshotCardRef = useRef(null);
  const outlineCardRef = useRef(null);
  const voiceMemoCardRef = useRef(null);
  const canvasViewportRef = useRef(null);

  // Keep latest state in ref to avoid stale closures in debounced saves
  const latestStateRef = useRef({
    textNodes: [],
    strokes: [],
    voiceTranscript: null,
    voiceDuration: 0,
    snapshots: [],
    outlineData: null
  });
  latestStateRef.current = {
    textNodes,
    strokes,
    voiceTranscript,
    voiceDuration,
    snapshots,
    outlineData
  };

  // Sync when active page or loaded note data changes
  useEffect(() => {
    setTextNodes(initialNoteData?.textNodes || []);
    setStrokes(initialNoteData?.strokes || []);
    setVoiceTranscript(initialNoteData?.voiceTranscript || null);

    if (initialNoteData?.voiceDuration) {
      setVoiceDuration(initialNoteData.voiceDuration);
    } else if (initialNoteData?.voiceTranscript) {
      const words = initialNoteData.voiceTranscript.trim().split(/\s+/).filter(Boolean).length;
      setVoiceDuration(Math.max(1, Math.ceil(words / 2.2)));
    } else {
      setVoiceDuration(0);
    }

    setSnapshots(initialNoteData?.snapshots || []);
    setOutlineData(initialNoteData?.outlineData || null);

    historyRef.current = [];
    redoRef.current = [];
  }, [initialNoteData, activePage?.id]);

  // Debounced auto-save
  const saveTimeoutRef = useRef(null);
  const triggerSave = useCallback(
    (nextNotes, nextStrokes, nextVoiceTranscript, nextVoiceDuration, nextSnapshots, nextOutlineData) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (onSaveNotes) {
          const current = latestStateRef.current;
          onSaveNotes({
            textNodes: nextNotes !== undefined ? nextNotes : current.textNodes,
            strokes: nextStrokes !== undefined ? nextStrokes : current.strokes,
            voiceTranscript: nextVoiceTranscript !== undefined ? nextVoiceTranscript : current.voiceTranscript,
            voiceDuration: nextVoiceDuration !== undefined ? nextVoiceDuration : current.voiceDuration,
            snapshots: nextSnapshots !== undefined ? nextSnapshots : current.snapshots,
            outlineData: nextOutlineData !== undefined ? nextOutlineData : current.outlineData
          });
        }
      }, 600);
    },
    [onSaveNotes]
  );

  // Push to history before state update
  const pushHistory = useCallback((currentNodes, currentStrokes) => {
    historyRef.current.push({
      textNodes: JSON.parse(JSON.stringify(currentNodes)),
      strokes: JSON.parse(JSON.stringify(currentStrokes))
    });
    if (historyRef.current.length > 30) historyRef.current.shift();
    redoRef.current = [];
  }, []);

  // Handle external Undo
  useEffect(() => {
    if (undoTrigger > 0 && historyRef.current.length > 0) {
      const prev = historyRef.current.pop();
      redoRef.current.push({
        textNodes: JSON.parse(JSON.stringify(textNodes)),
        strokes: JSON.parse(JSON.stringify(strokes))
      });
      setTextNodes(prev.textNodes);
      setStrokes(prev.strokes);
      triggerSave(prev.textNodes, prev.strokes);
    }
  }, [undoTrigger]);

  // Handle external Redo
  useEffect(() => {
    if (redoTrigger > 0 && redoRef.current.length > 0) {
      const next = redoRef.current.pop();
      historyRef.current.push({
        textNodes: JSON.parse(JSON.stringify(textNodes)),
        strokes: JSON.parse(JSON.stringify(strokes))
      });
      setTextNodes(next.textNodes);
      setStrokes(next.strokes);
      triggerSave(next.textNodes, next.strokes);
    }
  }, [redoTrigger]);

  const handleSeekVideo = (seconds) => {
    setVideoSeekTimestamp(seconds);
    const videoCard = document.getElementById('canvas-card-video');
    if (videoCard) {
      videoCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Safe functional updater for textNodes avoiding stale closures and excess history pushes during drag
  const handleTextNodesChange = useCallback(
    (updated, shouldPushHistory = false) => {
      setTextNodes((prevNodes) => {
        const next = typeof updated === 'function' ? updated(prevNodes) : updated;
        if (shouldPushHistory) {
          pushHistory(prevNodes, latestStateRef.current.strokes);
        }
        latestStateRef.current.textNodes = next;
        triggerSave(
          next,
          latestStateRef.current.strokes,
          latestStateRef.current.voiceTranscript,
          latestStateRef.current.voiceDuration,
          latestStateRef.current.snapshots,
          latestStateRef.current.outlineData
        );
        return next;
      });
    },
    [triggerSave, pushHistory]
  );

  // Helper to dynamically find the bottom edge of cards
  const getCardsBottom = () => {
    const gridEl = document.querySelector('.studio-cards-grid');
    if (gridEl && gridEl.offsetHeight > 0) {
      return Math.max(60, gridEl.offsetTop + gridEl.offsetHeight + 24);
    }
    if (hasAnyCards) {
      return 440;
    }
    return 60;
  };

  // Add Note Box (Positioned cleanly based on whether cards exist, preventing overlaps)
  const handleAddNoteBox = (defaultContent = '', customX = null, customY = null) => {
    const cardsBottom = getCardsBottom();
    const currentNodes = latestStateRef.current.textNodes || [];

    let targetX = 30;
    let targetY = cardsBottom;

    if (customY !== null && customY !== undefined) {
      targetY = Math.max(cardsBottom, customY);
      targetX = customX !== null && customX !== undefined ? customX : 30;
    } else if (currentNodes.length > 0) {
      // Find the lowest point of any existing note box to avoid stacking/overlapping
      const maxBottom = Math.max(
        cardsBottom - 20,
        ...currentNodes.map((n) => {
          const el = document.getElementById(`node-box-${n.id}`);
          const actualHeight = el ? el.offsetHeight : (n.height || 140);
          return (n.y || cardsBottom) + actualHeight;
        })
      );
      targetY = maxBottom + 20;
      targetX = 30;
    }

    pushHistory(currentNodes, strokes);

    const newNode = {
      id: uuidv4(),
      nodeType: 'text',
      x: Math.round(targetX),
      y: Math.round(targetY),
      width: 680,
      height: 140,
      content: defaultContent,
      textColor: 'var(--text-main)'
    };

    const next = [...currentNodes, newNode];
    latestStateRef.current.textNodes = next;
    setTextNodes(next);
    triggerSave(next, strokes, voiceTranscript, voiceDuration, snapshots, outlineData);
    setActiveFocusedNodeId(newNode.id);

    setTimeout(() => {
      const el = document.getElementById(`node-box-${newNode.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const textarea = document.getElementById(`textbox-textarea-${newNode.id}`);
      if (textarea) textarea.focus();
    }, 100);
  };

  // Handle live video timestamp insertion
  const handleInsertLiveTimestamp = (currentTime) => {
    const formatted = formatTime(currentTime);
    const stampText = `⏱️ [${formatted}] `;

    const currentNodes = latestStateRef.current.textNodes || [];
    // If a note box is currently focused, or if only 1 note box exists, insert into it
    const activeNode = activeFocusedNodeId
      ? currentNodes.find((n) => n.id === activeFocusedNodeId)
      : (currentNodes.length === 1 ? currentNodes[0] : null);

    if (activeNode) {
      const textarea = document.getElementById(`textbox-textarea-${activeNode.id}`);
      let newContent = activeNode.content || '';
      if (textarea && typeof textarea.selectionStart === 'number') {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        newContent = newContent.substring(0, start) + stampText + newContent.substring(end);
      } else {
        newContent = newContent.trim() ? `${newContent}\n${stampText}` : stampText;
      }

      handleTextNodesChange((prevNodes) =>
        prevNodes.map((n) => (n.id === activeNode.id ? { ...n, content: newContent } : n)),
        true
      );
      setActiveFocusedNodeId(activeNode.id);

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
        }
      }, 50);
      return;
    }

    // Otherwise, create a clean note box directly below the cards
    handleAddNoteBox(`⏱️ Timestamp [${formatted}]: `);
  };

  // Handle frame capture: Creates a new SnapshotCodeCard for this keyframe
  const handleCaptureFrame = (currentTime) => {
    const time = typeof currentTime === 'number' ? currentTime : (videoSeekTimestamp || 0);
    const formatted = formatTime(time);
    const ytId = activePage?.video_url ? extractYouTubeId(activePage.video_url) : null;
    const thumbnail = ytId
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      : '/fastapi_keyframe.jpg';

    const newSnapshot = {
      id: uuidv4(),
      timestamp: Math.round(time),
      title: `Keyframe Snapshot [${formatted}]`,
      description: `Synchronized keyframe snapshot captured from video at ${formatted}.`,
      imageSrc: thumbnail,
      code: `# Snippet captured at ${formatted}\n\n`,
      tags: ['#keyframe', `#${formatted}`],
      syncStatus: 'Synced just now',
      createdAt: Date.now()
    };

    const nextSnapshots = [...snapshots, newSnapshot];
    setSnapshots(nextSnapshots);
    triggerSave(textNodes, strokes, voiceTranscript, voiceDuration, nextSnapshots, outlineData);

    setTimeout(() => {
      const el = document.getElementById(`canvas-card-snapshot-${newSnapshot.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  // Handle snapshot deletion
  const handleRemoveSnapshot = (snapshotId) => {
    const nextSnapshots = snapshots.filter((s) => s.id !== snapshotId);
    setSnapshots(nextSnapshots);
    triggerSave(textNodes, strokes, voiceTranscript, voiceDuration, nextSnapshots, outlineData);
  };

  // Handle snapshot edit/update
  const handleUpdateSnapshot = (snapshotId, updatedFields) => {
    const nextSnapshots = snapshots.map((s) =>
      s.id === snapshotId ? { ...s, ...updatedFields } : s
    );
    setSnapshots(nextSnapshots);
    triggerSave(textNodes, strokes, voiceTranscript, voiceDuration, nextSnapshots, outlineData);
  };

  // Handle outline card deletion
  const handleRemoveOutline = () => {
    setOutlineData(null);
    triggerSave(textNodes, strokes, voiceTranscript, voiceDuration, snapshots, null);
  };

  // Handle voice memo card deletion
  const handleRemoveVoiceMemo = () => {
    setVoiceTranscript(null);
    setVoiceDuration(0);
    triggerSave(textNodes, strokes, null, 0, snapshots, outlineData);
  };

  // Handle Voice Memo speech recognition
  const handleToggleVoiceMemo = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isVoiceRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsVoiceRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceRecording(true);
        voiceStartTimeRef.current = Date.now();
      };

      recognition.onresult = (event) => {
        let fullStr = '';
        for (let i = 0; i < event.results.length; i++) {
          fullStr += event.results[i][0].transcript + ' ';
        }
        if (fullStr.trim()) {
          const text = fullStr.trim();
          const words = text.split(/\s+/).filter(Boolean).length;
          const elapsed = voiceStartTimeRef.current
            ? Math.max(1, Math.round((Date.now() - voiceStartTimeRef.current) / 1000))
            : Math.max(1, Math.ceil(words / 2.2));
          setVoiceTranscript(text);
          setVoiceDuration(elapsed);
          triggerSave(textNodes, strokes, text, elapsed, snapshots, outlineData);
          setTimeout(() => {
            scrollToCard('canvas-card-voicememo');
          }, 100);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsVoiceRecording(false);
    }
  };

  // Toggle Video AI Chat Window
  const handleToggleAiChat = () => {
    if (!hasGeminiApiKey) {
      const confirmSet = window.confirm(
        "Gemini API Key is not configured in the database!\n\nTo chat with Gemini about this video's transcript, please set your Gemini API Key in the Profile menu (top-right avatar icon).\n\nWould you like to enter your Gemini API Key now?"
      );
      if (confirmSet && onPromptSetApiKey) {
        onPromptSetApiKey();
      }
      return;
    }

    if (!isChatOpen) {
      setIsChatOpen(true);
      setIsChatMinimized(false);
    } else if (isChatMinimized) {
      setIsChatMinimized(false);
    } else {
      setIsChatOpen(false);
    }
  };

  // Pan Tool (Hand tool / middle-click / spacebar drag)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handlePointerDownCanvas = (e) => {
    if (
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('button') ||
      e.target.closest('.textbox-header') ||
      e.target.closest('.resizer-handle') ||
      e.target.closest('.floating-bottom-dock') ||
      e.target.closest('.minimap-floating-card') ||
      e.target.closest('.video-ai-chat-window-container') ||
      e.target.closest('.video-chat-minimized-pill')
    ) {
      return;
    }

    if (activeTool === 'pan' || e.button === 1 || e.spaceKey) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: canvasViewportRef.current ? canvasViewportRef.current.scrollLeft : 0,
        scrollTop: canvasViewportRef.current ? canvasViewportRef.current.scrollTop : 0
      };
      if (canvasViewportRef.current) {
        canvasViewportRef.current.style.cursor = 'grabbing';
      }
      e.preventDefault();
    }
  };

  const handlePointerMoveCanvas = (e) => {
    if (!isPanningRef.current || !canvasViewportRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    canvasViewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    canvasViewportRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handlePointerUpCanvas = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      if (canvasViewportRef.current) {
        canvasViewportRef.current.style.cursor = activeTool === 'pan' ? 'grab' : 'default';
      }
    }
  };

  // Double click canvas to add note
  const handleCanvasDoubleClick = (e) => {
    if (
      e.target.closest('.canvas-card') ||
      e.target.closest('.textbox-item') ||
      e.target.closest('.floating-dock-container') ||
      e.target.closest('.minimap-floating-card') ||
      e.target.closest('.video-ai-chat-window-container') ||
      e.target.closest('.video-chat-minimized-pill') ||
      e.target.closest('.canvas-empty-welcome-card')
    ) {
      return;
    }
    const rect = canvasViewportRef.current.getBoundingClientRect();
    const scale = (zoom || 100) / 100;
    const cardsBottom = getCardsBottom();
    const clickX = Math.max(20, (e.clientX - rect.left + canvasViewportRef.current.scrollLeft) / scale);
    const clickY = Math.max(cardsBottom, (e.clientY - rect.top + canvasViewportRef.current.scrollTop) / scale);

    handleAddNoteBox('', clickX, clickY);
  };

  // Minimap Navigation: Scroll to specific card
  const scrollToCard = (cardId) => {
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-glow');
      setTimeout(() => el.classList.remove('highlight-glow'), 1200);
    }
  };

  return (
    <div className="studio-canvas-outer-wrapper">
      {/* 1. SCROLLABLE CANVAS VIEWPORT */}
      <div
        className={`studio-canvas-viewport ${activeTool === 'pan' ? 'cursor-grab' : ''}`}
        ref={canvasViewportRef}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerLeave={handlePointerUpCanvas}
      >
        <div
          className="studio-canvas-content note-canvas-background"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            width: '100%'
          }}
        >
          {/* Drawing layer for Freehand Pen & Highlighter */}
          <DrawingLayer
            strokes={strokes}
            onStrokesChange={(nextStrokes) => {
              pushHistory(textNodes, strokes);
              setStrokes(nextStrokes);
              triggerSave(textNodes, nextStrokes, voiceTranscript, voiceDuration, snapshots, outlineData);
            }}
            activeTool={activeTool}
            color={color}
            lineWidth={lineWidth}
            canvasWidth={2400}
            canvasHeight={3600}
          />

          {/* Structured Studio Grid Cards: Render ONLY what the user has added to this page */}
          {hasAnyCards && (
            <div className="studio-cards-grid">
              {/* Card 1: Video Stream Card - only if video is attached */}
              {hasVideo && (
                <VideoStreamCard
                  cardRef={videoCardRef}
                  videoUrl={activePage?.video_url}
                  pageTitle={activePage?.title || 'Video Stream'}
                  onInsertLiveTimestamp={handleInsertLiveTimestamp}
                  onCaptureFrame={handleCaptureFrame}
                  onSeekVideo={handleSeekVideo}
                  externalSeekTime={videoSeekTimestamp}
                  isPausedWhileTyping={isPausedWhileTyping}
                  onTogglePauseWhileTyping={() => setIsPausedWhileTyping(!isPausedWhileTyping)}
                  onOpenVideoModal={onOpenVideoModal}
                  onRemoveVideo={onRemoveVideo}
                />
              )}

              {/* Card 2: Snapshot & Code Cards - only for captured snapshots */}
              {snapshots.map((snap) => (
                <SnapshotCodeCard
                  key={snap.id}
                  id={`canvas-card-snapshot-${snap.id}`}
                  cardRef={snapshotCardRef}
                  timestamp={snap.timestamp}
                  title={snap.title}
                  description={snap.description}
                  imageSrc={snap.imageSrc || '/fastapi_keyframe.jpg'}
                  code={snap.code}
                  tags={snap.tags || ['#keyframe']}
                  syncStatus={snap.syncStatus || 'Synced'}
                  onSeekVideo={handleSeekVideo}
                  onClose={() => handleRemoveSnapshot(snap.id)}
                  onUpdate={(updated) => handleUpdateSnapshot(snap.id, updated)}
                />
              ))}

              {/* Card 3: Course Outline Card - only if outline data exists */}
              {outlineData && (
                <CourseOutlineCard
                  cardRef={outlineCardRef}
                  timestamp={outlineData.timestamp || 0}
                  title={outlineData.title || 'Course Outline'}
                  instructorReference={outlineData.instructorReference || ''}
                  milestones={outlineData.milestones}
                  onSeekVideo={handleSeekVideo}
                  onClose={handleRemoveOutline}
                  onRegenerateOutline={() => {
                    handleAddNoteBox('📝 **Key Milestones:**\n- Video core concepts\n- Summary notes');
                  }}
                />
              )}

              {/* Card 4: Voice Memo Transcript Card - only if voice transcript exists */}
              {Boolean(voiceTranscript) && (
                <VoiceMemoCard
                  cardRef={voiceMemoCardRef}
                  timestamp={0}
                  duration={voiceDuration}
                  confidence="98.4%"
                  transcriptText={voiceTranscript}
                  onTranscriptChange={(newText, newDuration) => {
                    setVoiceTranscript(newText);
                    if (newDuration) setVoiceDuration(newDuration);
                    triggerSave(textNodes, strokes, newText, newDuration || voiceDuration, snapshots, outlineData);
                  }}
                  isRecordingExternal={isVoiceRecording}
                  onSeekVideo={handleSeekVideo}
                  onClose={handleRemoveVoiceMemo}
                />
              )}
            </div>
          )}

          {/* Clean Empty Page Welcome Card - displayed when nothing has been inserted yet */}
          {isPageCompletelyEmpty && (
            <div className="canvas-empty-welcome-card">
              <div className="empty-welcome-icon-wrap">
                <Sparkles size={28} className="empty-welcome-icon" />
              </div>
              <h2 className="empty-welcome-title">Empty Canvas</h2>
              <p className="empty-welcome-desc">
                This page is empty. Attach a YouTube video, add a note box, or record a voice memo to get started.
              </p>
              <div className="empty-welcome-actions">
                <button
                  className="empty-action-btn primary"
                  onClick={onOpenVideoModal}
                  title="Attach YouTube video to this page"
                >
                  <Video size={15} />
                  <span>Attach Video</span>
                </button>
                <button
                  className="empty-action-btn secondary"
                  onClick={() => handleAddNoteBox('')}
                  title="Add a text note box"
                >
                  <StickyNote size={15} />
                  <span>Add Note Box</span>
                </button>
                <button
                  className="empty-action-btn secondary"
                  onClick={handleToggleVoiceMemo}
                  title="Record a voice note"
                >
                  <Mic size={15} />
                  <span>Voice Memo</span>
                </button>
              </div>
            </div>
          )}

          {/* User-added Custom Text Boxes / Notes (using TextBoxLayer) */}
          <TextBoxLayer
            textNodes={textNodes}
            onTextNodesChange={handleTextNodesChange}
            activeFocusedId={activeFocusedNodeId}
            onFocusNode={setActiveFocusedNodeId}
            activeColor={color}
            zoom={zoom}
          />
        </div>
      </div>

      {/* 2. FIXED FLOATING BOTTOM CANVAS DOCK (Permanently pinned to window bottom) */}
      <div className="floating-dock-container fixed-dock">
        <div className="floating-bottom-dock">
          {/* Select pointer tool */}
          <button
            className={`dock-tool-btn ${activeTool === 'select' ? 'active-purple-round' : ''}`}
            onClick={() => onToolChange('select')}
            title="Select Cursor (Move notes and interact with cards)"
          >
            <MousePointer size={15} />
          </button>

          {/* Pan hand tool */}
          <button
            className={`dock-tool-btn ${activeTool === 'pan' ? 'active-purple-round' : ''}`}
            onClick={() => onToolChange('pan')}
            title="Pan / Hand Tool (Drag canvas)"
          >
            <Hand size={15} />
          </button>

          {/* Gemini AI Video Chat Button (Replaces CornerDownRight connector) */}
          <button
            className={`dock-tool-btn dock-ai-chat-btn ${isChatOpen && !isChatMinimized ? 'active-purple-round' : ''} ${!hasGeminiApiKey ? 'disabled-locked' : ''}`}
            onClick={handleToggleAiChat}
            title={
              !hasGeminiApiKey
                ? "Chat with Gemini (API Key required - set in Profile dropdown at top right)"
                : isChatOpen && !isChatMinimized
                ? "Close Gemini Video Chat"
                : "Chat with Gemini about this Video Transcript"
            }
          >
            <Sparkles size={15} />
            {!hasGeminiApiKey && (
              <span className="dock-lock-badge" title="Gemini API Key Required">
                <Key size={8} />
              </span>
            )}
          </button>

          {/* Straight Arrow / Pen tool */}
          <button
            className={`dock-tool-btn ${activeTool === 'pen' ? 'active-purple-round' : ''}`}
            onClick={() => onToolChange(activeTool === 'pen' ? 'select' : 'pen')}
            title="Pen / Freehand Drawing Tool"
          >
            <ArrowRight size={15} />
          </button>

          {/* Sticky note tool */}
          <button
            className="dock-tool-btn"
            onClick={() => handleAddNoteBox('')}
            title="Add a Text Box / Note"
          >
            <StickyNote size={15} />
          </button>

          {/* Snapshot tool */}
          <button
            className="dock-tool-btn"
            onClick={() => handleCaptureFrame(videoSeekTimestamp || 0)}
            title="Snapshot Keyframe"
          >
            <Camera size={15} />
          </button>

          {/* Mic tool */}
          <button
            className={`dock-tool-btn ${isVoiceRecording ? 'active-purple-round pulsing' : ''}`}
            onClick={handleToggleVoiceMemo}
            title={isVoiceRecording ? "Listening... Click to stop" : "Speak to create a voice note"}
          >
            <Mic size={15} />
          </button>

          {/* Zoom reset */}
          <button
            className="dock-zoom-reset-btn"
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
          >
            <span>{zoom}%</span>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* 3. FIXED MINIMAP WIDGET (Permanently pinned to window bottom-right) */}
      <div className="minimap-floating-card fixed-minimap">
        <div className="minimap-header">
          <span className="minimap-title-text">MINIMAP</span>
          <button
            className="minimap-expand-btn"
            onClick={onResetZoom}
            title="Fit Canvas to View"
          >
            <Maximize2 size={11} />
          </button>
        </div>

        <div className="minimap-body-viewport">
          <div className="minimap-grid-preview">
            {/* Top-Left: Video Stream (Purple block) */}
            {hasVideo && (
              <div
                className="minimap-block block-purple"
                onClick={() => scrollToCard('canvas-card-video')}
                title="Click to focus Video Stream card"
              />
            )}

            {/* Top-Right: Snapshot & Code (Blue block) */}
            {snapshots.length > 0 && (
              <div
                className="minimap-block block-blue"
                onClick={() => scrollToCard(`canvas-card-snapshot-${snapshots[0].id}`)}
                title="Click to focus Snapshot & Code card"
              />
            )}

            {/* Bottom-Left: Course Outline (Teal block) */}
            {outlineData && (
              <div
                className="minimap-block block-teal"
                onClick={() => scrollToCard('canvas-card-outline')}
                title="Click to focus Course Outline card"
              />
            )}

            {/* Bottom-Right: Voice Memo (Lavender block) */}
            {voiceTranscript && (
              <div
                className="minimap-block block-lavender"
                onClick={() => scrollToCard('canvas-card-voicememo')}
                title="Click to focus Voice Memo card"
              />
            )}

            {/* If no cards but user added text notes or drawings */}
            {!hasAnyCards && (textNodes.length > 0 || strokes.length > 0) && (
              <div
                className="minimap-block block-notes"
                title="Active notes and sketches on canvas"
              />
            )}

            {/* Completely empty page indicator */}
            {isPageCompletelyEmpty && (
              <div className="minimap-empty-hint">Canvas Empty</div>
            )}
          </div>
        </div>
      </div>

      {/* 4. ALWAYS-ACCESSIBLE VIDEO AI CHAT WINDOW & MINIMIZED PILL */}
      <VideoAiChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isMinimized={isChatMinimized}
        onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
        activePage={activePage}
        apiKey={geminiApiKey}
        hasGeminiApiKey={hasGeminiApiKey}
        onAddNoteToCanvas={(content) => handleAddNoteBox(content)}
        onOpenVideoModal={onOpenVideoModal}
        onPromptSetApiKey={onPromptSetApiKey}
      />
    </div>
  );
}
