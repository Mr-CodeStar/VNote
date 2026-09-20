import React from 'react';
import { Edit2, Highlighter, Eraser, RotateCcw, Trash2, Plus, Palette, Image as ImageIcon, Check, Save, Mic } from 'lucide-react';

const SWATCHES = [
  { name: 'Dark Slate', value: '#1e293b' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Royal Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Magenta', value: '#ec4899' },
  { name: 'Crimson', value: '#ef4444' },
  { name: 'Coral Orange', value: '#f97316' },
  { name: 'Amber Gold', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' }
];

export default function CanvasToolbar({
  activeTool,
  onToolChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onAddTextBox,
  onTriggerImageUpload,
  onUndoDrawing,
  onClearDrawing,
  isSaving,
  onForceSave,
  isListening,
  onToggleSpeech
}) {
  return (
    <div className="canvas-sticky-toolbar">
      {/* 1. Add Text & Image Node Actions */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn highlight"
          onClick={onAddTextBox}
          title="Click or press Ctrl+N to add a Text Box"
        >
          <Plus size={14} />
          <span>Add Text Box</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onTriggerImageUpload}
          title="Paste image (Ctrl+V) or Upload Screenshot"
        >
          <ImageIcon size={14} />
          <span>Add Screenshot</span>
        </button>

        <button
          className={`toolbar-btn ${isListening ? 'recording' : ''}`}
          onClick={onToggleSpeech}
          title={isListening ? "Listening... Click to stop" : "Speech to Text: Speak to create a note"}
          style={isListening ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}
        >
          <Mic size={14} className={isListening ? 'pulse-anim' : ''} />
          <span>{isListening ? 'Listening...' : 'Voice Note'}</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 2. Freehand Sketch Tools (Pen, Highlighter, Eraser) */}
      <div className="toolbar-group">
        <button
          className={`tool-icon-btn ${activeTool === 'pen' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'pen' ? 'none' : 'pen')}
          title="Pen Tool (Click to toggle freehand drawing)"
        >
          <Edit2 size={14} />
        </button>

        <button
          className={`tool-icon-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'highlighter' ? 'none' : 'highlighter')}
          title="Highlighter Tool"
        >
          <Highlighter size={14} />
        </button>

        <button
          className={`tool-icon-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange(activeTool === 'eraser' ? 'none' : 'eraser')}
          title="Eraser Tool"
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      {/* 3. Color Palette & Custom Color Picker */}
      {activeTool !== 'eraser' && (
        <div className="toolbar-group color-section">
          <div className="color-palette-header">
            <span className="palette-label">Color:</span>
          </div>

          <div className="color-palette">
            {SWATCHES.map((c) => {
              const isSelected = color.toLowerCase() === c.value.toLowerCase();
              const isLightColor = c.value === '#ffffff' || c.value === '#eab308' || c.value === '#06b6d4';
              return (
                <button
                  key={c.value}
                  className={`color-swatch ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => onColorChange(c.value)}
                  title={`${c.name} (${c.value})`}
                  aria-label={c.name}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      style={{ color: isLightColor ? '#0f172a' : '#ffffff' }}
                      className="swatch-check-icon"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="custom-color-picker-box"
            style={{ borderColor: color }}
            title={`Custom Color Picker (Active: ${color})`}
          >
            <div
              className="color-preview-circle"
              style={{ backgroundColor: color }}
            />
            <Palette size={14} className="color-wheel-icon" />
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="paint-color-input"
            />
          </div>
        </div>
      )}

      {/* 4. Stroke Width Slider */}
      {activeTool !== 'none' && (
        <div className="width-slider-box">
          <span className="slider-label">{lineWidth}px</span>
          <input
            type="range"
            min="2"
            max="32"
            value={lineWidth}
            onChange={(e) => onLineWidthChange(Number(e.target.value))}
            className="line-range-slider"
          />
        </div>
      )}

      <div className="toolbar-divider"></div>

      {/* 5. Undo & Clear Canvas */}
      <div className="toolbar-group">
        <button className="tool-icon-btn" onClick={onUndoDrawing} title="Undo stroke">
          <RotateCcw size={14} />
        </button>
        <button className="tool-icon-btn danger" onClick={onClearDrawing} title="Clear drawings">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="toolbar-right-meta" style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          className="toolbar-btn" 
          onClick={onForceSave} 
          disabled={isSaving}
          title="Force Save Notes"
          style={{ marginRight: '12px', padding: '4px 10px', height: '28px', opacity: isSaving ? 0.6 : 1 }}
        >
          <Save size={14} />
          <span>Save</span>
        </button>
        {isSaving ? (
          <span className="save-badge saving">Saving...</span>
        ) : (
          <span className="save-badge saved">Auto-saved</span>
        )}
      </div>
    </div>
  );
}

