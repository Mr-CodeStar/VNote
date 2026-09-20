import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Trash2, GripHorizontal, Code, Palette } from 'lucide-react';

export default function TextBoxLayer({
  textNodes,
  onTextNodesChange,
  activeFocusedId,
  onFocusNode,
  activeColor
}) {
  const [activeDragId, setActiveDragId] = useState(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleUpdateNode = (id, newFields) => {
    onTextNodesChange((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, ...newFields } : node))
    );
  };

  const handleDeleteNode = (id) => {
    onTextNodesChange((prevNodes) => prevNodes.filter((node) => node.id !== id));
  };

  const autoScrollRafRef = useRef(null);
  const lastPointerRef = useRef({ clientX: 0, clientY: 0 });
  const onPointerMoveCallbackRef = useRef(null);

  const stopAutoScroll = () => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    onPointerMoveCallbackRef.current = null;
  };

  useEffect(() => {
    return () => stopAutoScroll();
  }, []);

  const startAutoScroll = () => {
    if (autoScrollRafRef.current) return;
    const scrollContainer = document.querySelector('.workspace-scroll-content');
    if (!scrollContainer) return;

    const scrollStep = () => {
      const rect = scrollContainer.getBoundingClientRect();
      const scrollThreshold = 40;
      const maxScrollSpeed = 15;
      let scrolled = false;

      const { clientX, clientY } = lastPointerRef.current;

      if (clientY < rect.top + scrollThreshold) {
        scrollContainer.scrollTop -= maxScrollSpeed;
        scrolled = true;
      } else if (clientY > rect.bottom - scrollThreshold) {
        scrollContainer.scrollTop += maxScrollSpeed;
        scrolled = true;
      }

      if (clientX < rect.left + scrollThreshold) {
        scrollContainer.scrollLeft -= maxScrollSpeed;
        scrolled = true;
      } else if (clientX > rect.right - scrollThreshold) {
        scrollContainer.scrollLeft += maxScrollSpeed;
        scrolled = true;
      }

      if (scrolled && onPointerMoveCallbackRef.current) {
        onPointerMoveCallbackRef.current(lastPointerRef.current);
      }
      
      autoScrollRafRef.current = requestAnimationFrame(scrollStep);
    };

    autoScrollRafRef.current = requestAnimationFrame(scrollStep);
  };

  // Stop auto scroll logic moved above

  // Drag Position (Header)
  const handlePointerDownDrag = (id, e) => {
    e.stopPropagation();
    setActiveDragId(id);
    onFocusNode?.(id);

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    dragOffsetRef.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };

    const handlePointerMove = (moveEvt) => {
      const newX = Math.max(10, moveEvt.clientX - dragOffsetRef.current.x);
      const newY = Math.max(10, moveEvt.clientY - dragOffsetRef.current.y);

      onTextNodesChange((prevNodes) =>
        prevNodes.map((n) => (n.id === id ? { ...n, x: newX, y: newY } : n))
      );
    };

    const handlePointerUp = () => {
      setActiveDragId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Drag Resize (Right Handle - Width expansion)
  const handlePointerDownResizeRight = (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const canvasBg = document.querySelector('.note-canvas-background');
    const startBgRect = canvasBg ? canvasBg.getBoundingClientRect() : { left: 0, top: 0 };
    const startXInCanvas = e.clientX - startBgRect.left;
    const startWidth = node.width || (node.nodeType === 'image' ? 520 : 720);

    lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };

    const handlePointerMove = (moveEvt) => {
      lastPointerRef.current = { clientX: moveEvt.clientX, clientY: moveEvt.clientY };
      const currentBgRect = canvasBg ? canvasBg.getBoundingClientRect() : { left: 0, top: 0 };
      const currentXInCanvas = moveEvt.clientX - currentBgRect.left;
      
      const deltaX = currentXInCanvas - startXInCanvas;
      const newWidth = Math.max(240, Math.min(3800, startWidth + deltaX));
      handleUpdateNode(id, { width: newWidth });
    };

    onPointerMoveCallbackRef.current = handlePointerMove;
    startAutoScroll();

    const handlePointerUp = () => {
      stopAutoScroll();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Drag Resize (Corner Handle - Both Width & Height expansion)
  const handlePointerDownResizeCorner = (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const canvasBg = document.querySelector('.note-canvas-background');
    const startBgRect = canvasBg ? canvasBg.getBoundingClientRect() : { left: 0, top: 0 };
    const startXInCanvas = e.clientX - startBgRect.left;
    const startYInCanvas = e.clientY - startBgRect.top;
    
    const startWidth = node.width || (node.nodeType === 'image' ? 520 : 720);
    const startHeight = node.height || 140;

    lastPointerRef.current = { clientX: e.clientX, clientY: e.clientY };

    const handlePointerMove = (moveEvt) => {
      lastPointerRef.current = { clientX: moveEvt.clientX, clientY: moveEvt.clientY };
      const currentBgRect = canvasBg ? canvasBg.getBoundingClientRect() : { left: 0, top: 0 };
      const currentXInCanvas = moveEvt.clientX - currentBgRect.left;
      const currentYInCanvas = moveEvt.clientY - currentBgRect.top;
      
      const deltaX = currentXInCanvas - startXInCanvas;
      const deltaY = currentYInCanvas - startYInCanvas;
      const newWidth = Math.max(240, Math.min(3800, startWidth + deltaX));
      const newHeight = Math.max(100, Math.min(3800, startHeight + deltaY));
      handleUpdateNode(id, { width: newWidth, height: newHeight, customResizedHeight: true });
    };

    onPointerMoveCallbackRef.current = handlePointerMove;
    startAutoScroll();

    const handlePointerUp = () => {
      stopAutoScroll();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Insert code snippet template
  const handleInsertCodeBlock = (id, currentContent) => {
    const codeTemplate = `\n\`\`\`python\n# Code snippet\n\`\`\`\n`;
    handleUpdateNode(id, { content: (currentContent || '') + codeTemplate });
  };

  // Apply active toolbar color to current text box
  const handleApplyColorToBox = (id) => {
    if (activeColor) {
      handleUpdateNode(id, { textColor: activeColor });
    }
  };

  // Auto-resize textarea height on change/paste
  const handleTextareaInput = (e, id) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
    handleUpdateNode(id, { content: target.value });
  };

  return (
    <div className="text-boxes-layer">
      {textNodes.map((node) => {
        const isImage = node.nodeType === 'image';
        const currentWidth = node.width || (isImage ? 520 : 720);
        const minHeight = node.height ? `${node.height}px` : '120px';

        return (
          <div
            key={node.id}
            id={`node-box-${node.id}`}
            className={`textbox-item ${isImage ? 'image-node' : ''} ${activeDragId === node.id ? 'dragging' : ''} ${activeFocusedId === node.id ? 'focused' : ''}`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${currentWidth}px`,
              minHeight: minHeight,
              height: 'auto'
            }}
            onClick={() => onFocusNode?.(node.id)}
          >
            {/* DRAG HEADER */}
            <div
              className="textbox-header"
              onPointerDown={(e) => handlePointerDownDrag(node.id, e)}
              title="Drag to reposition note box"
            >
              <GripHorizontal size={14} className="drag-handle-icon" />
              <span className="drag-label">{isImage ? 'Screenshot' : 'Note Box'}</span>

              <div className="textbox-actions">
                {!isImage && (
                  <>
                    <button
                      className="textbox-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyColorToBox(node.id);
                      }}
                      title="Apply current active color to this note text"
                    >
                      <Palette size={12} /> Color
                    </button>

                    <button
                      className="textbox-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertCodeBlock(node.id, node.content);
                      }}
                      title="Add Dark Code Block"
                    >
                      <Code size={12} /> Code
                    </button>
                  </>
                )}

                <button
                  className="textbox-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  title="Delete note box"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* BODY: TEXT vs IMAGE */}
            <div className="textbox-body">
              {isImage ? (
                <div className="image-node-container">
                  <img src={node.src} alt="Pasted Screenshot" className="pasted-note-image" />
                </div>
              ) : activeFocusedId === node.id ? (
                <textarea
                  id={`textbox-textarea-${node.id}`}
                  className="textbox-textarea"
                  style={{ color: node.textColor || 'var(--text-main)' }}
                  value={node.content || ''}
                  onFocus={() => onFocusNode?.(node.id)}
                  onInput={(e) => handleTextareaInput(e, node.id)}
                  onChange={(e) => handleTextareaInput(e, node.id)}
                  placeholder="Type your notes or paste images (Ctrl+V) here..."
                  autoFocus
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                />
              ) : (
                <div 
                  className="markdown-preview-container markdown-preview" 
                  style={{ color: node.textColor || 'var(--text-main)', padding: '8px' }}
                >
                  {node.content ? (
                    <ReactMarkdown>{node.content}</ReactMarkdown>
                  ) : (
                    <div className="empty-placeholder">Click to add text...</div>
                  )}
                </div>
              )}
            </div>

            {/* HORIZONTAL RIGHT RESIZE HANDLE */}
            <div
              className="resizer-handle resizer-right"
              onPointerDown={(e) => handlePointerDownResizeRight(node.id, e)}
              title="Drag horizontally to expand width"
            />

            {/* CORNER RESIZE HANDLE */}
            <div
              className="resizer-handle resizer-corner"
              onPointerDown={(e) => handlePointerDownResizeCorner(node.id, e)}
              title="Drag corner to expand width & height"
            />
          </div>
        );
      })}
    </div>
  );
}

