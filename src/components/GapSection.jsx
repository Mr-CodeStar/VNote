import React, { useState } from 'react';
import { Target, Zap, Check } from 'lucide-react';

export default function GapSection({ onGenerateAiNotes, isGenerating }) {

  const handleClick = () => {
    if (onGenerateAiNotes && !isGenerating) {
      onGenerateAiNotes();
    }
  };

  return (
    <div className="gap-divider-section">
      <div className="gap-line"></div>
      
      {/* SMALL CIRCULAR ACTION BUTTON IN GAP AREA */}
      <div className="gap-button-container">
        <button
          className={`gap-circular-btn ${isGenerating ? 'active' : ''}`}
          onClick={handleClick}
          title="Generate AI Notes from video"
          disabled={isGenerating}
        >
          {isGenerating ? <Zap size={16} className="spinner-icon" /> : <Zap size={16} />}
        </button>

        {isGenerating && (
          <div className="gap-toast-tooltip">
            <Zap size={14} className="spinner-icon" /> Generating Notes...
          </div>
        )}
      </div>

      <div className="gap-line"></div>
    </div>
  );
}
