import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  X,
  Minus,
  Maximize2,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Video,
  AlertCircle,
  Key,
  BookOpen,
  HelpCircle,
  FileText
} from 'lucide-react';
import * as api from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const QUICK_PROMPTS = [
  '📌 Summarize Key Points',
  '💡 Explain Main Concepts',
  '❓ Quiz Me on this Video',
  '📝 Action Items & Notes'
];

function formatErrorMessage(rawMessage) {
  if (!rawMessage) return 'Could not communicate with Gemini API.';
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed.error && parsed.error.message) return parsed.error.message;
  } catch (e) {}
  return rawMessage;
}

export default function VideoAiChatWindow({
  isOpen,
  onClose,
  isMinimized,
  onToggleMinimize,
  activePage,
  apiKey,
  hasGeminiApiKey,
  onAddNoteToCanvas,
  onOpenVideoModal,
  onPromptSetApiKey
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, isLoadingTranscript]);

  // Focus input when window is opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Handle page/video change & initial transcript fetch
  useEffect(() => {
    const videoUrl = activePage?.video_url || '';
    if (videoUrl !== currentVideoUrl) {
      setCurrentVideoUrl(videoUrl);
      setTranscriptText('');
      setHasTranscript(false);

      if (videoUrl && isOpen && hasGeminiApiKey) {
        initVideoChat(videoUrl);
      } else if (!videoUrl) {
        setMessages([
          {
            id: uuidv4(),
            sender: 'ai',
            text: `👋 Hello! I'm your Gemini AI Tutor for **${activePage?.title || 'this page'}**.\n\n💡 *No video is currently attached to this page.* You can click **Add Video** in the top bar to attach a YouTube lecture and analyze its transcript, or ask me any questions about your notes right here!`,
            timestamp: Date.now()
          }
        ]);
      }
    }
  }, [activePage?.id, activePage?.video_url, isOpen, hasGeminiApiKey]);

  // If user opened chat for the first time on a page with video
  useEffect(() => {
    if (isOpen && activePage?.video_url && messages.length === 0 && !isLoadingTranscript && hasGeminiApiKey) {
      initVideoChat(activePage.video_url);
    }
  }, [isOpen, activePage?.video_url, messages.length, hasGeminiApiKey]);

  const initVideoChat = async (videoUrl) => {
    setIsLoadingTranscript(true);
    try {
      const data = await api.chatWithVideoGemini({
        videoUrl,
        pageTitle: activePage?.title || 'Video Lecture',
        action: 'init',
        apiKey
      });

      if (data.transcript) {
        setTranscriptText(data.transcript);
      }
      setHasTranscript(Boolean(data.hasTranscript));

      setMessages([
        {
          id: uuidv4(),
          sender: 'ai',
          text: data.reply,
          timestamp: Date.now()
        }
      ]);
    } catch (err) {
      console.error('Failed to initialize video chat:', err);
      setMessages([
        {
          id: uuidv4(),
          sender: 'ai',
          text: `⚠️ **Unable to initialize Gemini:** ${formatErrorMessage(err.message)}\n\nPlease check your Gemini API key in the top-right profile menu.`,
          isError: true,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const question = typeof textToSend === 'string' ? textToSend : inputText.trim();
    if (!question || isSending) return;

    if (!hasGeminiApiKey) {
      if (onPromptSetApiKey) onPromptSetApiKey();
      return;
    }

    const userMsg = {
      id: uuidv4(),
      sender: 'user',
      text: question,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      // Build history for backend
      const history = messages.slice(-8).map((m) => ({
        role: m.sender === 'ai' ? 'model' : 'user',
        text: m.text
      }));

      const data = await api.chatWithVideoGemini({
        videoUrl: activePage?.video_url || null,
        pageTitle: activePage?.title || 'Video Lecture',
        message: question,
        history,
        apiKey,
        transcript: transcriptText
      });

      if (data.transcript && !transcriptText) {
        setTranscriptText(data.transcript);
        setHasTranscript(true);
      }

      const aiMsg = {
        id: uuidv4(),
        sender: 'ai',
        text: data.reply,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Error sending message to Gemini:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          sender: 'ai',
          text: `⚠️ **Error:** ${formatErrorMessage(err.message)}`,
          isError: true,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear chat conversation for this video?')) {
      if (activePage?.video_url && hasGeminiApiKey) {
        initVideoChat(activePage.video_url);
      } else {
        setMessages([]);
      }
    }
  };

  // If chat is not open, do not render full window
  if (!isOpen) {
    return null;
  }

  // MINIMIZED FLOATING PILL (Always present on page when minimized)
  if (isMinimized) {
    return (
      <div
        className="video-chat-minimized-pill"
        onClick={onToggleMinimize}
        title="Expand Gemini Video Chat"
      >
        <div className="minimized-pill-sparkle">
          <Sparkles size={14} />
        </div>
        <span className="minimized-pill-title">Gemini Video Copilot</span>
        {messages.length > 0 && (
          <span className="minimized-pill-count">{messages.length}</span>
        )}
        <Maximize2 size={13} className="minimized-pill-icon" />
      </div>
    );
  }

  // FULL FLOATING CHAT WINDOW
  return (
    <div className="video-ai-chat-window-container" onDoubleClick={(e) => e.stopPropagation()}>
      {/* 1. WINDOW HEADER */}
      <div className="video-chat-header">
        <div className="chat-header-left">
          <div className="gemini-avatar-glow">
            <Sparkles size={15} />
          </div>
          <div className="chat-title-block">
            <div className="chat-main-title">
              <span>Gemini Video Copilot</span>
              <span className="chat-gemini-badge">3.8 FLASH</span>
            </div>
            <div className="chat-subtitle">
              {isLoadingTranscript ? (
                <span className="status-loading">
                  <Loader2 size={10} className="spinner" /> Syncing video transcript...
                </span>
              ) : hasTranscript ? (
                <span className="status-synced">⚡ Transcript Synced with Gemini</span>
              ) : activePage?.video_url ? (
                <span className="status-no-transcript">Lecture Video Attached</span>
              ) : (
                <span className="status-no-video">Page Mode (No Video)</span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button
              className="chat-action-btn"
              onClick={handleClearHistory}
              title="Reset / Restart Conversation"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            className="chat-action-btn"
            onClick={onToggleMinimize}
            title="Minimize to floating pill on page"
          >
            <Minus size={14} />
          </button>
          <button
            className="chat-action-btn close"
            onClick={onClose}
            title="Close Chat Window"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 2. CHAT BODY / MESSAGES */}
      <div className="video-chat-body">
        {/* If no API key is present */}
        {!hasGeminiApiKey && (
          <div className="chat-no-key-warning">
            <Key size={20} className="warning-key-icon" />
            <h4>Gemini API Key Required</h4>
            <p>
              To chat with Gemini and ask questions about your video transcript, please configure your Gemini API Key.
            </p>
            <button
              className="chat-set-key-cta-btn"
              onClick={() => onPromptSetApiKey && onPromptSetApiKey()}
            >
              <Key size={13} />
              <span>Set Gemini API Key</span>
            </button>
          </div>
        )}

        {/* Loading Transcript Banner */}
        {isLoadingTranscript && (
          <div className="transcript-loading-banner">
            <Loader2 size={18} className="spinner icon-purple" />
            <div className="transcript-loading-text">
              <strong>Extracting Video Transcript</strong>
              <span>Sending transcript to Gemini AI for analysis...</span>
            </div>
          </div>
        )}

        {/* Messages List */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
          >
            <div className="message-avatar">
              {msg.sender === 'user' ? (
                <div className="user-icon-bubble">You</div>
              ) : (
                <div className="ai-icon-bubble">
                  <Sparkles size={13} />
                </div>
              )}
            </div>

            <div className="message-content-wrapper">
              <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'} ${msg.isError ? 'error-bubble' : ''}`}>
                <div className="markdown-chat-render">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>

              {/* Action buttons for AI responses */}
              {msg.sender === 'ai' && !msg.isError && (
                <div className="message-bottom-actions">
                  <button
                    className="msg-action-chip"
                    onClick={() => onAddNoteToCanvas && onAddNoteToCanvas(msg.text)}
                    title="Add this AI answer as a note on your canvas"
                  >
                    <Plus size={12} />
                    <span>Add to Canvas</span>
                  </button>
                  <button
                    className="msg-action-chip"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    title="Copy response to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} className="icon-green" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {isSending && (
          <div className="chat-message-row ai-row">
            <div className="message-avatar">
              <div className="ai-icon-bubble pulsing">
                <Sparkles size={13} />
              </div>
            </div>
            <div className="message-content-wrapper">
              <div className="message-bubble ai-bubble thinking-bubble">
                <div className="thinking-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span className="thinking-label">Gemini is studying transcript & typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. QUICK PROMPT CHIPS */}
      {hasGeminiApiKey && !isLoadingTranscript && messages.length > 0 && (
        <div className="chat-quick-prompts-bar">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="quick-prompt-chip"
              onClick={() => handleSendMessage(prompt.replace(/^[^a-zA-Z0-9]+/, ''))}
              disabled={isSending}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* 4. CHAT INPUT BAR */}
      <div className="video-chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input-field"
          rows={1}
          placeholder={
            !hasGeminiApiKey
              ? "Gemini API Key required to chat..."
              : activePage?.video_url
              ? "Ask anything about this video's concepts, code, or explanation..."
              : "Ask Gemini any questions about this page..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasGeminiApiKey || isSending || isLoadingTranscript}
        />

        <button
          className={`chat-send-btn ${inputText.trim() && !isSending ? 'active' : ''}`}
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending || !hasGeminiApiKey || isLoadingTranscript}
          title="Send Question (Enter)"
        >
          {isSending ? <Loader2 size={15} className="spinner" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
