import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Trash2, GripHorizontal, Code, Palette, Eye, Edit3 } from 'lucide-react';

export default function TextBoxLayer({
  textNodes = [],
  onTextNodesChange,
  activeFocusedId,
  onFocusNode,
  activeColor,
  zoom = 100
}) {
  const [activeDragId, setActiveDragId] = useState(null);
  const [previewModes, setPreviewModes] = useState({}); // nodeId -> boolean

  const handleUpdateNode = (id, newFields) => {
    onTextNodesChange((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, ...newFields } : node))
    );
  };

  const handleDeleteNode = (id) => {
    onTextNodesChange((prevNodes) => prevNodes.filter((node) => node.id !== id));
  };

  // Drag Note Box by Header with scale-aware delta
  const handlePointerDownDrag = (id, e) => {
    e.stopPropagation();
    setActiveDragId(id);
    onFocusNode?.(id);

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const startNodeX = node.x;
    const startNodeY = node.y;
    const scale = (zoom || 100) / 100;

    const handlePointerMove = (moveEvt) => {
      const deltaX = (moveEvt.clientX - startClientX) / scale;
      const deltaY = (moveEvt.clientY - startClientY) / scale;
      const newX = Math.max(10, Math.round(startNodeX + deltaX));
      const newY = Math.max(10, Math.round(startNodeY + deltaY));

      onTextNodesChange((prevNodes) =>
        prevNodes.map((n) => (n.id === id ? { ...n, x: newX, y: newY } : n))
      );
    };

    const handlePointerUp = () => {
      setActiveDragId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onTextNodesChange?.((prevNodes) => prevNodes, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Horizontal Resize
  const handlePointerDownResizeRight = (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const startX = e.clientX;
    const startWidth = node.width || (node.nodeType === 'image' ? 520 : 680);
    const scale = (zoom || 100) / 100;

    const handlePointerMove = (moveEvt) => {
      const deltaX = (moveEvt.clientX - startX) / scale;
      const newWidth = Math.max(260, Math.min(1800, Math.round(startWidth + deltaX)));
      handleUpdateNode(id, { width: newWidth });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onTextNodesChange?.((prevNodes) => prevNodes, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Corner Resize
  const handlePointerDownResizeCorner = (id, e) => {
    e.stopPropagation();
    e.preventDefault();

    const node = textNodes.find((n) => n.id === id);
    if (!node) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width || (node.nodeType === 'image' ? 520 : 680);
    const startHeight = node.height || 140;
    const scale = (zoom || 100) / 100;

    const handlePointerMove = (moveEvt) => {
      const deltaX = (moveEvt.clientX - startX) / scale;
      const deltaY = (moveEvt.clientY - startY) / scale;
      const newWidth = Math.max(260, Math.min(1800, Math.round(startWidth + deltaX)));
      const newHeight = Math.max(100, Math.min(1800, Math.round(startHeight + deltaY)));
      handleUpdateNode(id, { width: newWidth, height: newHeight });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onTextNodesChange?.((prevNodes) => prevNodes, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Insert code snippet template
  const handleInsertCodeBlock = (id, currentContent) => {
    const codeTemplate = `\n\`\`\`python\n# Code snippet\nprint("Hello FastAPI")\n\`\`\`\n`;
    handleUpdateNode(id, { content: (currentContent || '') + codeTemplate });
  };

  // Apply active toolbar color to current text box
  const handleApplyColorToBox = (id) => {
    if (activeColor) {
      handleUpdateNode(id, { textColor: activeColor });
    }
  };

  const handleTogglePreview = (id) => {
    setPreviewModes((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Textarea input
  const handleTextareaInput = (e, id) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.max(80, target.scrollHeight)}px`;
    handleUpdateNode(id, { content: target.value });
  };

  return (
    <div className="text-boxes-layer">
      {textNodes.map((node) => {
        const isImage = node.nodeType === 'image';
        const currentWidth = node.width || (isImage ? 520 : 680);
        const minHeight = node.height ? `${node.height}px` : '120px';
        const isPreview = previewModes[node.id] || false;

        return (
          <div
            key={node.id}
            id={`node-box-${node.id}`}
            className={`textbox-item ${isImage ? 'image-node' : ''} ${
              activeDragId === node.id ? 'dragging' : ''
            } ${activeFocusedId === node.id ? 'focused' : ''}`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: `${currentWidth}px`,
              minHeight: minHeight
            }}
            onClick={() => onFocusNode?.(node.id)}
          >
            {/* 1. DRAG HEADER */}
            <div
              className="textbox-header"
              onPointerDown={(e) => handlePointerDownDrag(node.id, e)}
              title="Drag to reposition note box"
            >
              <div className="textbox-header-left">
                <GripHorizontal size={14} className="drag-handle-icon" />
                <span className="drag-label">{isImage ? 'Screenshot' : 'Note Box'}</span>
              </div>

              <div className="textbox-actions">
                {!isImage && (
                  <>
                    <button
                      type="button"
                      className="textbox-action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyColorToBox(node.id);
                      }}
                      title="Apply active color to this note"
                    >
                      <Palette size={13} />
                    </button>

                    <button
                      type="button"
                      className="textbox-action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertCodeBlock(node.id, node.content);
                      }}
                      title="Insert Code Snippet"
                    >
                      <Code size={13} />
                    </button>

                    <button
                      type="button"
                      className={`textbox-action-icon-btn ${isPreview ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePreview(node.id);
                      }}
                      title={isPreview ? "Switch to Edit Mode" : "Switch to Markdown Preview"}
                    >
                      {isPreview ? <Edit3 size={13} /> : <Eye size={13} />}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="textbox-action-icon-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  title="Delete Note Box"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* 2. BODY: TEXT / MARKDOWN PREVIEW / IMAGE */}
            <div
              className="textbox-body"
              onClick={(e) => {
                e.stopPropagation();
                onFocusNode?.(node.id);
              }}
            >
              {isImage ? (
                <div className="image-node-container">
                  <img src={node.src} alt="Note Screenshot" className="pasted-note-image" />
                </div>
              ) : isPreview ? (
                <div
                  className="textbox-markdown-preview"
                  style={{ color: node.textColor || 'var(--text-main)' }}
                >
                  {node.content ? (
                    <ReactMarkdown>{node.content}</ReactMarkdown>
                  ) : (
                    <p className="empty-preview-hint">Empty note. Click edit icon to type.</p>
                  )}
                </div>
              ) : (
                <textarea
                  id={`textbox-textarea-${node.id}`}
                  className="textbox-textarea"
                  style={{ color: node.textColor || 'var(--text-main)' }}
                  value={node.content || ''}
                  onFocus={() => onFocusNode?.(node.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.max(80, el.scrollHeight)}px`;
                    }
                  }}
                  onInput={(e) => handleTextareaInput(e, node.id)}
                  onChange={(e) => handleTextareaInput(e, node.id)}
                  placeholder="Type your lecture notes, summaries, or paste screenshots (Ctrl+V) here..."
                  rows={3}
                />
              )}
            </div>

            {/* 3. RESIZE HANDLES */}
            <div
              className="resizer-handle resizer-right"
              onPointerDown={(e) => handlePointerDownResizeRight(node.id, e)}
              title="Drag horizontally to resize width"
            />
            <div
              className="resizer-handle resizer-corner"
              onPointerDown={(e) => handlePointerDownResizeCorner(node.id, e)}
              title="Drag corner to resize width & height"
            />
          </div>
        );
      })}
    </div>
  );
}
