import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function DrawingLayer({
  strokes,
  onStrokesChange,
  activeTool,
  color,
  lineWidth,
  canvasWidth = 4000,
  canvasHeight = 4000
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);

  const isDrawingTool = activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser';

  // Calculate precise canvas coordinates accounting for CSS scaling
  const getCanvasCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allStrokes = [...strokes];
    if (currentPoints.length > 1 && isDrawingTool) {
      allStrokes.push({
        tool: activeTool,
        color,
        lineWidth,
        points: currentPoints
      });
    }

    allStrokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.lineWidth * 2.5;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = stroke.lineWidth * 2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = stroke.lineWidth;
        ctx.stroke();
      }
    });
  }, [strokes, currentPoints, activeTool, color, lineWidth, isDrawingTool]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handlePointerDown = (e) => {
    if (!isDrawingTool) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const coord = getCanvasCoordinates(e);
    setCurrentPoints([coord]);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !isDrawingTool) return;
    e.preventDefault();
    const coord = getCanvasCoordinates(e);
    setCurrentPoints((prev) => [...prev, coord]);
  };

  const handlePointerUp = (e) => {
    if (!isDrawing || !isDrawingTool) return;
    e.preventDefault();
    setIsDrawing(false);
    if (currentPoints.length > 1) {
      const newStroke = {
        tool: activeTool,
        color,
        lineWidth,
        points: currentPoints
      };
      onStrokesChange([...strokes, newStroke]);
    }
    setCurrentPoints([]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className={`drawing-canvas-layer ${isDrawingTool ? 'interactive' : 'pointer-events-none'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
