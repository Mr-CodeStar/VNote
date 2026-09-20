import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasToolbar from './CanvasToolbar';
import DrawingLayer from './DrawingLayer';
import TextBoxLayer from './TextBoxLayer';

export default function NoteCanvasContainer({
  initialNoteData,
  onSaveNotes,
  isSaving,
  insertedTimestamp,
  videoComponent
}) {
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'pen' | 'highlighter' | 'eraser'
  const [color, setColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(4);

  const [textNodes, setTextNodes] = useState(initialNoteData?.textNodes || []);
  const [strokes, setStrokes] = useState(initialNoteData?.strokes || []);
  const [activeFocusedNodeId, setActiveFocusedNodeId] = useState(null);

  // Dynamic infinite height that grows as you scroll
  const [infiniteHeight, setInfiniteHeight] = useState(4000);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Sync when initialNoteData changes (e.g. switching page)
  useEffect(() => {
    setTextNodes(initialNoteData?.textNodes || []);
    setStrokes(initialNoteData?.strokes || []);
    setActiveFocusedNodeId(null);
  }, [initialNoteData]);

  // Scroll UI to target note box and focus its textarea
  const scrollToAndFocusNode = useCallback((nodeId) => {
    setActiveFocusedNodeId(nodeId);
    setTimeout(() => {
      const boxEl = document.getElementById(`node-box-${nodeId}`);
      if (boxEl) {
        boxEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const textareaEl = document.getElementById(`textbox-textarea-${nodeId}`);
      if (textareaEl) {
        textareaEl.focus();
      }
    }, 80);
  }, []);

  // Insert timestamp note when triggered from video player
  useEffect(() => {
    if (!insertedTimestamp) return;

    let targetX = 60;
    let targetY = 60;

    if (textNodes.length > 0) {
      const maxY = Math.max(...textNodes.map((n) => n.y));
      const bottomNode = textNodes.find((n) => n.y === maxY);
      const bottomEl = bottomNode ? document.getElementById(`node-box-${bottomNode.id}`) : null;
      const bottomHeight = bottomEl ? bottomEl.offsetHeight : (bottomNode?.height || 140);

      targetX = bottomNode ? bottomNode.x : 60;
      targetY = maxY + bottomHeight + 24;
    }

    const newNode = {
      id: uuidv4(),
      nodeType: 'text',
      x: targetX,
      y: targetY,
      width: 500,
      height: 120,
      content: insertedTimestamp
    };

    setTextNodes((prev) => [...prev, newNode]);
    scrollToAndFocusNode(newNode.id);
  }, [insertedTimestamp]);

  // Debounced Auto-Save to Server API & File
  const saveTimeoutRef = useRef(null);
  const triggerAutoSave = useCallback(
    (newTextNodes, newStrokes) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onSaveNotes({
          textNodes: newTextNodes,
          strokes: newStrokes
        });
      }, 800);
    },
    [onSaveNotes]
  );

  const handleForceSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    onSaveNotes({
      textNodes,
      strokes
    });
  }, [onSaveNotes, textNodes, strokes]);

  const handleTextNodesChange = (updated) => {
    const nextTextNodes = typeof updated === 'function' ? updated(textNodes) : updated;
    setTextNodes(nextTextNodes);
    triggerAutoSave(nextTextNodes, strokes);
  };

  const handleStrokesChange = (nextStrokes) => {
    setStrokes(nextStrokes);
    triggerAutoSave(textNodes, nextStrokes);
  };

  // Add Text Box (Double Click, Alt+N, or Toolbar button)
  const handleAddTextBoxAtCoord = (x = null, y = null, defaultContent = '', explicitCoords = false) => {
    let finalX = 80;
    let finalY = 80;

    if (explicitCoords && x !== null && y !== null) {
      finalX = x;
      finalY = y;
    } else if (activeFocusedNodeId) {
      // Position directly below currently focused text box
      const focusedNode = textNodes.find((n) => n.id === activeFocusedNodeId);
      if (focusedNode) {
        const focusedEl = document.getElementById(`node-box-${activeFocusedNodeId}`);
        const actualHeight = focusedEl ? focusedEl.offsetHeight : (focusedNode.height || 140);
        finalX = focusedNode.x;
        finalY = focusedNode.y + actualHeight + 20;
      }
    } else if (textNodes.length > 0) {
      // Stack below the last added node
      const lastNode = textNodes[textNodes.length - 1];
      const lastEl = document.getElementById(`node-box-${lastNode.id}`);
      const lastHeight = lastEl ? lastEl.offsetHeight : (lastNode.height || 140);
      finalX = lastNode.x;
      finalY = lastNode.y + lastHeight + 20;
    } else {
      // Default initial position centered in visible canvas scroll view
      const scrollParent = document.querySelector('.workspace-scroll-content');
      const scrollTop = scrollParent ? scrollParent.scrollTop : 0;
      finalX = 80;
      finalY = Math.max(60, scrollTop + 100);
    }

    const newNode = {
      id: uuidv4(),
      nodeType: 'text',
      x: Math.max(20, finalX),
      y: Math.max(20, finalY),
      width: 720,
      height: 140,
      content: defaultContent
    };

    handleTextNodesChange([...textNodes, newNode]);
    scrollToAndFocusNode(newNode.id);
  };

  const handleAddTextBoxAtCoordRef = useRef(handleAddTextBoxAtCoord);
  useEffect(() => {
    handleAddTextBoxAtCoordRef.current = handleAddTextBoxAtCoord;
  });

  const handleToggleSpeech = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && handleAddTextBoxAtCoordRef.current) {
        handleAddTextBoxAtCoordRef.current(null, null, transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }
  }, [isListening]);

  // Keyboard shortcut (Alt + N) avoiding Ctrl+N browser collision
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isNKey = e.key === 'n' || e.key === 'N' || e.code === 'KeyN';
      if (isNKey && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleAddTextBoxAtCoord();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [textNodes, activeFocusedNodeId]);

  // Add Image Node from DataURL
  const handleAddImageNode = (dataUrl, x = 100, y = 100) => {
    const scrollParent = document.querySelector('.workspace-scroll-content');
    const scrollTop = scrollParent ? scrollParent.scrollTop : 0;
    const newImageNode = {
      id: uuidv4(),
      nodeType: 'image',
      src: dataUrl,
      x,
      y: Math.max(60, scrollTop + 80),
      width: 540
    };
    handleTextNodesChange([...textNodes, newImageNode]);
    scrollToAndFocusNode(newImageNode.id);
  };

  // Global Clipboard Paste Listener (Ctrl+V Screenshots)
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target.result;
              handleAddImageNode(dataUrl, 120, 120);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [textNodes]);

  // Image Upload Handler from File Input
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        handleAddImageNode(evt.target.result, 120, 120);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Double Click event on workspace creates text box
  const handleCanvasDoubleClick = (e) => {
    if (activeTool !== 'none') return;
    // Ensure we don't trigger if clicking inside the video player or toolbar
    if (e.target.closest('.video-player-container')) return;
    if (e.target.closest('.canvas-sticky-toolbar')) return;
    
    // We want to allow clicks on note-canvas-background or workspace-scroll-content (the empty space below)
    if (e.target.classList.contains('note-canvas-background') || e.target.classList.contains('workspace-scroll-content')) {
      const canvasBg = document.querySelector('.note-canvas-background');
      if (!canvasBg) return;
      
      const bgRect = canvasBg.getBoundingClientRect();
      
      // Calculate coordinates relative to the note-canvas-background exactly where the mouse is
      const x = Math.max(20, e.clientX - bgRect.left);
      const y = Math.max(20, e.clientY - bgRect.top);
      
      handleAddTextBoxAtCoord(x, y, '', true);
    }
  };

  const handleUndoDrawing = () => {
    if (strokes.length === 0) return;
    const nextStrokes = strokes.slice(0, -1);
    handleStrokesChange(nextStrokes);
  };

  const handleClearDrawing = () => {
    if (confirm('Clear all drawings on this page?')) {
      handleStrokesChange([]);
    }
  };

  // Infinite Scroll Growth logic
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 500) {
      setInfiniteHeight((prev) => prev + 1500);
    }
  };

  // Compute dynamic canvas height based on bottom-most text box position or infinite height
  const maxNodeY = textNodes.length > 0 ? Math.max(...textNodes.map((n) => n.y + (n.height || 140))) : 0;
  const dynamicCanvasHeight = Math.max(infiniteHeight, maxNodeY + 1500);

  // Extend the canvas width horizontally if text nodes go wide
  const maxNodeX = textNodes.length > 0 ? Math.max(...textNodes.map((n) => n.x + (n.width || 720))) : 0;
  const dynamicCanvasWidth = Math.max(4000, maxNodeX + 1000);

  return (
    <div className="note-canvas-workspace" ref={containerRef}>
      {/* Hidden File Input for Image Screenshots */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* OneNote Sticky Ribbon Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        color={color}
        onColorChange={setColor}
        lineWidth={lineWidth}
        onLineWidthChange={setLineWidth}
        onAddTextBox={() => handleAddTextBoxAtCoord()}
        onTriggerImageUpload={() => fileInputRef.current?.click()}
        onUndoDrawing={handleUndoDrawing}
        onClearDrawing={handleClearDrawing}
        isSaving={isSaving}
        onForceSave={handleForceSave}
        isListening={isListening}
        onToggleSpeech={handleToggleSpeech}
      />

      {/* Scrollable Workspace Content (Video + Canvas) */}
      <div 
        className="workspace-scroll-content" 
        onDoubleClick={handleCanvasDoubleClick}
        onScroll={handleScroll}
        title={activeTool === 'none' ? 'Double-click anywhere or press Alt+N to place a text box' : ''}
      >
        {videoComponent}

        {/* Dynamic Size Infinite Canvas Area */}
        <div
          className="note-canvas-background"
          style={{ minHeight: `${dynamicCanvasHeight}px`, minWidth: `${dynamicCanvasWidth}px` }}
        >
          <DrawingLayer
            strokes={strokes}
            onStrokesChange={handleStrokesChange}
            activeTool={activeTool}
            color={color}
            lineWidth={lineWidth}
            canvasWidth={dynamicCanvasWidth}
            canvasHeight={dynamicCanvasHeight}
          />

          <TextBoxLayer
            textNodes={textNodes}
            onTextNodesChange={handleTextNodesChange}
            activeFocusedId={activeFocusedNodeId}
            onFocusNode={setActiveFocusedNodeId}
            activeColor={color}
          />
        </div>
      </div>
    </div>
  );
}

