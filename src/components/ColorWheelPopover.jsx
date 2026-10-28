import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pipette, Check, Palette } from 'lucide-react';

/**
 * HSB (HSV) to Hex conversion
 * h in [0, 360], s in [0, 100], b in [0, 100]
 */
function hsbToHex(h, s, b) {
  s /= 100;
  b /= 100;
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return b - b * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const r = Math.round(f(5) * 255);
  const g = Math.round(f(3) * 255);
  const bVal = Math.round(f(1) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bVal.toString(16).padStart(2, '0')}`;
}

/**
 * Hex to HSB (HSV) conversion
 */
function hexToHsb(hex) {
  if (!hex) return { h: 217, s: 76, b: 96 };
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { h: 217, s: 76, b: 96 };
  const num = parseInt(c, 16);
  if (isNaN(num)) return { h: 217, s: 76, b: 96 };
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), b: Math.round(v * 100) };
}

const PRESET_SWATCHES = [
  '#ef4444', // Coral Red
  '#f97316', // Sunset Orange
  '#f59e0b', // Amber Gold
  '#10b981', // Emerald
  '#06b6d4', // Cyan Teal
  '#3b82f6', // Royal Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
  '#0f172a', // Obsidian
  '#ffffff'  // Pure White
];

export default function ColorWheelPopover({
  isOpen,
  onClose,
  color = '#3b82f6',
  onColorChange
}) {
  const [h, setH] = useState(217);
  const [s, setS] = useState(76);
  const [b, setB] = useState(96);
  const [hexInput, setHexInput] = useState(color.toUpperCase());

  const wheelRef = useRef(null);
  const popoverRef = useRef(null);
  const nativePickerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Sync internal HSB from incoming color prop
  useEffect(() => {
    if (color && !isDraggingRef.current) {
      const hsb = hexToHsb(color);
      setH(hsb.h);
      setS(hsb.s);
      setB(hsb.b);
      setHexInput(color.toUpperCase());
    }
  }, [color]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        if (e.target.closest('.color-wheel-anchor-trigger')) return;
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen, onClose]);

  // Handle pointer calculation on the wheel
  const handleWheelPointer = useCallback(
    (e) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const radius = rect.width / 2;
      const centerX = rect.left + radius;
      const centerY = rect.top + radius;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // CSS conic-gradient starts at 12 o'clock (0deg).
      // Math.atan2(dy, dx) has 0 at 3 o'clock.
      // Offset by +90deg to align 12 o'clock = 0deg (Red)
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      if (angle >= 360) angle -= 360;

      const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
      const sat = Math.round((dist / radius) * 100);

      const newH = Math.round(angle);
      const newS = sat;
      // Default brightness to at least 90 if it was very dark, so user gets rich vivid color
      const currentB = Math.max(30, b);

      setH(newH);
      setS(newS);
      setB(currentB);

      const newHex = hsbToHex(newH, newS, currentB);
      setHexInput(newHex.toUpperCase());
      onColorChange(newHex);
    },
    [b, onColorChange]
  );

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    try {
      wheelRef.current?.setPointerCapture?.(e.pointerId);
    } catch (_) {}
    handleWheelPointer(e);
  };

  const handlePointerMove = (e) => {
    if (isDraggingRef.current) {
      handleWheelPointer(e);
    }
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    try {
      wheelRef.current?.releasePointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  const handleBrightnessChange = (newB) => {
    setB(newB);
    const newHex = hsbToHex(h, s, newB);
    setHexInput(newHex.toUpperCase());
    onColorChange(newHex);
  };

  const handleSelectSwatch = (swatchHex) => {
    const hsb = hexToHsb(swatchHex);
    setH(hsb.h);
    setS(hsb.s);
    setB(hsb.b);
    setHexInput(swatchHex.toUpperCase());
    onColorChange(swatchHex);
  };

  const handleHexInputChange = (val) => {
    setHexInput(val);
    const clean = val.startsWith('#') ? val : `#${val}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      const hsb = hexToHsb(clean);
      setH(hsb.h);
      setS(hsb.s);
      setB(hsb.b);
      onColorChange(clean);
    }
  };

  if (!isOpen) return null;

  // Calculate indicator pip position on the 140px wheel (radius = 70px)
  const wheelRadius = 70;
  // Radian offset (-90deg) because 0deg is at 12 o'clock
  const rad = ((h - 90) * Math.PI) / 180;
  const dist = (s / 100) * wheelRadius;
  const pipX = 70 + dist * Math.cos(rad);
  const pipY = 70 + dist * Math.sin(rad);

  const pureHueHex = hsbToHex(h, 100, 100);

  return (
    <div className="color-wheel-popover-card" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
      {/* Popover Header */}
      <div className="color-popover-header">
        <div className="popover-header-title">
          <Palette size={13} className="header-icon-purple" />
          <span>Color Studio</span>
        </div>
        <div
          className="popover-color-chip-preview"
          style={{ backgroundColor: color }}
          title={`Active color: ${color}`}
        />
      </div>

      {/* Interactive Chromatic Color Wheel */}
      <div className="color-wheel-interactive-stage">
        <div
          ref={wheelRef}
          className="color-wheel-disc-interactive"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Click or drag anywhere on the wheel to pick any color"
        >
          {/* Chromatic Saturation / Hue Gradient Layer */}
          <div className="color-wheel-spectrum-layer" />

          {/* Dimming layer reflecting current brightness slider */}
          <div
            className="color-wheel-brightness-dimmer"
            style={{ opacity: 1 - b / 100 }}
          />

          {/* Active Thumb / Pip Indicator */}
          <div
            className="color-wheel-thumb-pip"
            style={{
              left: `${pipX}px`,
              top: `${pipY}px`,
              backgroundColor: color
            }}
          />
        </div>
      </div>

      {/* Brightness Slider */}
      <div className="color-lightness-slider-box">
        <div className="slider-label-row">
          <span className="slider-label">Brightness</span>
          <span className="slider-val-tag">{b}%</span>
        </div>
        <div className="slider-track-wrap">
          <input
            type="range"
            min="0"
            max="100"
            value={b}
            onChange={(e) => handleBrightnessChange(Number(e.target.value))}
            className="color-lightness-range-input"
            style={{
              background: `linear-gradient(to right, #000000, ${pureHueHex})`
            }}
          />
        </div>
      </div>

      {/* Preset Swatches Palette */}
      <div className="color-preset-swatches-grid">
        {PRESET_SWATCHES.map((swatchHex) => {
          const isSelected = swatchHex.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={swatchHex}
              type="button"
              className={`preset-swatch-chip ${isSelected ? 'selected' : ''}`}
              style={{ backgroundColor: swatchHex }}
              onClick={() => handleSelectSwatch(swatchHex)}
              title={swatchHex}
            >
              {isSelected && (
                <Check
                  size={10}
                  color={swatchHex === '#ffffff' ? '#0f172a' : '#ffffff'}
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Hex Input & Native Eyedropper Bar */}
      <div className="color-input-footer-bar">
        <div className="hex-input-group">
          <span className="hex-hash">HEX</span>
          <input
            type="text"
            className="hex-text-input"
            value={hexInput}
            onChange={(e) => handleHexInputChange(e.target.value)}
            maxLength={7}
            placeholder="#3B82F6"
          />
        </div>

        {/* Native OS Color Wheel / Eyedropper Button */}
        <button
          type="button"
          className="native-eyedropper-btn"
          onClick={() => {
            if (nativePickerRef.current?.showPicker) {
              nativePickerRef.current.showPicker();
            } else {
              nativePickerRef.current?.click();
            }
          }}
          title="Open system color wheel or screen eyedropper"
        >
          <Pipette size={13} />
        </button>
        <input
          ref={nativePickerRef}
          type="color"
          value={color}
          onChange={(e) => handleSelectSwatch(e.target.value)}
          className="hidden-system-color-input"
        />
      </div>
    </div>
  );
}
