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
  FileText,
  BookmarkPlus
} from 'lucide-react';
import * as api from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const QUICK_PROMPTS = [
  { label: '📌 Summarize Key Points', prompt: 'Please summarize the main concepts and core takeaways from this video lecture in bullet points.' },
  { label: '💡 Explain Main Concepts', prompt: 'Explain the most important technical concepts introduced in this video simply with examples.' },
  { label: '❓ Quiz Me on This Video', prompt: 'Create 3 quick multiple-choice questions to test my understanding of the material in this video.' },
  { label: '💻 Show Code Examples', prompt: 'List and explain the key code snippets or implementation patterns demonstrated in this video.' }
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
  initialMessages = [],
  onMessagesChange,
  onAddNoteToCanvas,
  onOpenVideoModal,
  onPromptSetApiKey
}) {
  const [messages, setMessages] = useState(() => {
    if (Array.isArray(initialMessages) && initialMessages.length > 0) return initialMessages;
    if (activePage?.id) {
      try {
        const stored = localStorage.getItem(`vnote_chat_${activePage.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [savedMsgId, setSavedMsgId] = useState(null);
  const [savedAllSuccess, setSavedAllSuccess] = useState(false);
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

  // Sync messages whenever active page or loaded initialMessages change
  useEffect(() => {
    if (Array.isArray(initialMessages) && initialMessages.length > 0) {
      setMessages(initialMessages);
    } else if (activePage?.id) {
      try {
        const stored = localStorage.getItem(`vnote_chat_${activePage.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {}
      setMessages([]);
    }
  }, [activePage?.id, initialMessages]);

  // Helper to update messages, notify parent, and persist to localStorage
  const updateMessages = (updater) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onMessagesChange) {
        onMessagesChange(next);
      }
      if (activePage?.id) {
        try {
          localStorage.setItem(`vnote_chat_${activePage.id}`, JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  };

  // Handle page/video change & initial transcript fetch
  useEffect(() => {
    const videoUrl = activePage?.video_url || '';
    if (videoUrl !== currentVideoUrl) {
      setCurrentVideoUrl(videoUrl);
      setTranscriptText('');
      setHasTranscript(false);

      // Only auto-initialize if there is NO existing chat history for this page
      const hasExistingHistory = messages.length > 0;
      if (videoUrl && isOpen && hasGeminiApiKey && !hasExistingHistory) {
        initVideoChat(videoUrl);
      } else if (!videoUrl && !hasExistingHistory) {
        updateMessages([
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

  // If user opened chat for the first time on a page with video and no history
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

      updateMessages([
        {
          id: uuidv4(),
          sender: 'ai',
          text: data.reply,
          timestamp: Date.now()
        }
      ]);
    } catch (err) {
      console.error('Failed to initialize video chat:', err);
      updateMessages([
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

    const nextMessages = [...messages, userMsg];
    updateMessages(nextMessages);
    setInputText('');
    setIsSending(true);

    try {
      // Build history for backend
      const history = nextMessages.slice(-8).map((m) => ({
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

      updateMessages([...nextMessages, aiMsg]);
    } catch (err) {
      console.error('Error sending message to Gemini:', err);
      updateMessages([
        ...nextMessages,
        {
          id: uuidv4(),
          sender: 'ai',
          text: `⚠️ **Error communicating with Gemini:** ${formatErrorMessage(err.message)}`,
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
    if (window.confirm('Reset conversation for this page?')) {
      if (activePage?.video_url && hasGeminiApiKey) {
        initVideoChat(activePage.video_url);
      } else {
        updateMessages([]);
      }
    }
  };

  // Option 1: Save a single AI response into a Canvas Text Box
  const handleSaveMessageToTextBox = (msgId, text) => {
    if (!text || !onAddNoteToCanvas) return;
    const pageTitle = activePage?.title || 'Lesson';
    const noteContent = `### 💡 AI Tutor Note: ${pageTitle}\n\n${text}`;
    onAddNoteToCanvas(noteContent);
    setSavedMsgId(msgId);
    setTimeout(() => setSavedMsgId(null), 2500);
  };

  // Option 2: Save the entire conversation into a Canvas Text Box
  const handleSaveAllChatToTextBox = () => {
    if (!messages || messages.length === 0 || !onAddNoteToCanvas) return;
    const pageTitle = activePage?.title || 'Lesson';
    let formatted = `### 💬 AI Study Chat: ${pageTitle}\n`;
    formatted += `*Saved: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}*\n\n`;

    messages.forEach((m) => {
      if (m.isError) return;
      if (m.sender === 'user') {
        formatted += `**🙋 Student:** ${m.text}\n\n`;
      } else {
        formatted += `**🤖 AI Copilot:**\n${m.text}\n\n---\n\n`;
      }
    });

    onAddNoteToCanvas(formatted);
    setSavedAllSuccess(true);
    setTimeout(() => setSavedAllSuccess(false), 2500);
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
              <span className="chat-gemini-badge">3.5 FLASH</span>
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
          {/* Header Action: Save Chat to Text Box */}
          {messages.length > 0 && (
            <button
              className={`chat-header-save-btn ${savedAllSuccess ? 'saved' : ''}`}
              onClick={handleSaveAllChatToTextBox}
              title="Save this conversation as a Text Box on this page"
            >
              {savedAllSuccess ? (
                <>
                  <Check size={12} className="icon-green" />
                  <span>Saved to Box!</span>
                </>
              ) : (
                <>
                  <FileText size={12} />
                  <span>Save to Text Box</span>
                </>
              )}
            </button>
          )}

          {messages.length > 0 && (
            <button
              className="chat-action-btn"
              onClick={handleClearHistory}
              title="Reset / Clear Conversation"
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

        {/* Message Bubble Feed */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'} ${
              msg.isError ? 'error-row' : ''
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="message-avatar">
                <div className={`ai-icon-bubble ${msg.isError ? 'error-icon' : ''}`}>
                  {msg.isError ? <AlertCircle size={13} /> : <Sparkles size={13} />}
                </div>
              </div>
            )}

            <div className="message-content-wrapper">
              <div
                className={`message-bubble ${
                  msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'
                } ${msg.isError ? 'error-bubble' : ''}`}
              >
                <div className="markdown-chat-render">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>

              {/* Action buttons for AI responses */}
              {msg.sender === 'ai' && !msg.isError && (
                <div className="message-bottom-actions">
                  <button
                    className={`msg-action-chip ${savedMsgId === msg.id ? 'chip-saved' : ''}`}
                    onClick={() => handleSaveMessageToTextBox(msg.id, msg.text)}
                    title="Save this response into a Text Box on this page"
                  >
                    {savedMsgId === msg.id ? (
                      <>
                        <Check size={11} className="icon-green" />
                        <span>Saved to Box!</span>
                      </>
                    ) : (
                      <>
                        <FileText size={11} />
                        <span>Save to Text Box</span>
                      </>
                    )}
                  </button>

                  <button
                    className="msg-action-chip"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    title="Copy response to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={11} className="icon-green" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Quick Save All Banner at bottom of messages */}
        {messages.length >= 2 && (
          <div className="save-all-chat-banner-container">
            <button
              className={`save-all-chat-banner-btn ${savedAllSuccess ? 'saved' : ''}`}
              onClick={handleSaveAllChatToTextBox}
            >
              {savedAllSuccess ? (
                <>
                  <Check size={13} className="icon-green" />
                  <span>Conversation saved into Canvas Text Box!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus size={13} />
                  <span>Save entire conversation into a Text Box note</span>
                </>
              )}
            </button>
          </div>
        )}

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
                <span className="thinking-label">Gemini is studying your lecture...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. QUICK SUGGESTION PROMPTS BAR */}
      <div className="chat-quick-prompts-bar">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            className="quick-prompt-pill"
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isSending}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* 4. CHAT INPUT BAR */}
      <div className="video-chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          rows={1}
          placeholder="Ask anything about this video's concepts, code, or explanation..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button
          className={`chat-send-btn ${inputText.trim() ? 'active' : ''}`}
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isSending}
          title="Send Question (Enter)"
        >
          {isSending ? <Loader2 size={15} className="spinner" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}
