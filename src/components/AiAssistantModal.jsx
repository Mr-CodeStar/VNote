import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  FileText,
  BrainCircuit,
  HelpCircle,
  Languages,
  X,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Share2
} from 'lucide-react';
import * as api from '../services/api';

const DEFAULT_FLASHCARDS = [
  {
    question: 'What is the primary architectural differentiator of FastAPI compared to Flask?',
    answer: 'FastAPI is built on ASGI (Asynchronous Server Gateway Interface) using Starlette and Uvicorn, enabling high-performance asynchronous concurrency, whereas Flask traditionally runs on WSGI.'
  },
  {
    question: 'What role does Pydantic play in FastAPI?',
    answer: 'Pydantic handles robust data validation, type hints, schema definitions, and serialization/deserialization with full IDE auto-completion.'
  },
  {
    question: 'Where can you access automatic interactive documentation in FastAPI?',
    answer: 'Swagger UI is available at /docs and ReDoc is available at /redoc out-of-the-box.'
  }
];

const DEFAULT_QUIZ = [
  {
    question: 'Which server gateway interface does FastAPI utilize for asynchronous request pipelining?',
    options: ['WSGI', 'ASGI', 'CGI', 'FastCGI'],
    correct: 1,
    explanation: 'FastAPI uses ASGI (via Starlette and Uvicorn) for non-blocking asynchronous request handling.'
  },
  {
    question: 'What library powers schema validation and data parsing in FastAPI?',
    options: ['Marshmallow', 'Cerberus', 'Pydantic', 'Django Forms'],
    correct: 2,
    explanation: 'FastAPI uses Pydantic models for runtime data parsing and type validation.'
  },
  {
    question: 'What decorator is used to declare a GET endpoint in FastAPI?',
    options: ['@app.route("/", methods=["GET"])', '@app.get("/")', '@fastapi.get("/")', '@router.fetch("/")'],
    correct: 1,
    explanation: '@app.get("/") is the native FastAPI decorator for GET endpoints.'
  }
];

export default function AiAssistantModal({
  isOpen,
  onClose,
  pageTitle = 'FastAPI for Beginners',
  videoUrl,
  pageId,
  onInsertAiNote
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'notes' | 'flashcards' | 'quiz' | 'mindmap' | 'translate'

  // Chat with Video state
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! I'm your Vnote AI Tutor for "${pageTitle}". Ask me any questions about the concepts, code, or architecture explained in this lecture.`
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState(DEFAULT_FLASHCARDS);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState(DEFAULT_QUIZ);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Language translation state
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  if (!isOpen) return null;

  // Handle Question Send
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userQ = inputQuestion.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setInputQuestion('');
    setIsThinking(true);

    const apiKey = localStorage.getItem('gemini_api_key');

    // Simulate / Call Gemini AI
    setTimeout(() => {
      let aiReply = '';
      const lower = userQ.toLowerCase();
      if (lower.includes('asgi') || lower.includes('wsgi')) {
        aiReply =
          'Unlike WSGI, which is synchronous and handles one request per worker thread, ASGI (Asynchronous Server Gateway Interface) allows asynchronous, event-loop-driven request pipelining. This allows FastAPI to handle thousands of concurrent WebSocket and HTTP requests with minimal memory overhead.';
      } else if (lower.includes('pydantic')) {
        aiReply =
          'Pydantic uses Python type annotations to validate request bodies and headers. If data fails validation, FastAPI automatically returns detailed JSON errors with HTTP 422 Unprocessable Entity.';
      } else {
        aiReply = `Based on the lecture transcript for "${pageTitle}", the instructor emphasizes modular route design, asynchronous dependency injection, and leveraging Starlette under the hood for near-Go and Node.js performance.`;
      }

      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
      setIsThinking(false);
    }, 700);
  };

  // Handle Quiz Option Click
  const handleSelectOption = (qIdx, optIdx) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) score++;
    });
    return score;
  };

  // Handle Translation
  const handleTranslateNotes = () => {
    setIsTranslating(true);
    setTimeout(() => {
      if (selectedLanguage === 'Spanish') {
        setTranslatedText(
          `## Arquitectura FastAPI y Configuración Raíz ASGI\n\nA diferencia de los microframeworks síncronos WSGI estándar, FastAPI aprovecha Starlette y Uvicorn para la canalización asíncrona de solicitudes.\n\n- **Alto rendimiento**: Rendimiento comparable a NodeJS y Go mediante Starlette.\n- **Documentación automática OpenAPI**: Generación Swagger UI inmediata en /docs.\n- **Sugerencias de tipos Pydantic**: Autocompletado completo en el IDE.`
        );
      } else if (selectedLanguage === 'French') {
        setTranslatedText(
          `## Architecture FastAPI et Configuration Racine ASGI\n\nContrairement aux microframeworks WSGI synchrones standard, FastAPI tire parti de Starlette et d'Uvicorn pour le traitement asynchrone des requêtes.\n\n- **Haute performance**: Résultats comparables à NodeJS et Go via Starlette.\n- **OpenAPI automatique**: Génération de l'interface utilisateur Swagger sur /docs.`
        );
      } else if (selectedLanguage === 'Hindi') {
        setTranslatedText(
          `## FastAPI आर्किटेक्चर और ASGI सेटअप\n\nपारंपरिक सिंक WSGI फ्रेमवर्क के विपरीत, FastAPI अतुल्यकालिक अनुरोध हैंडलिंग के लिए Starlette और Uvicorn का लाभ उठाता है।\n\n- **उच्च प्रदर्शन**: Starlette के माध्यम से NodeJS और Go के बराबर बेंचमार्क।\n- **स्वचालित ओपनएपीआई डॉक्स**: /docs पर स्वतः स्वैगर यूआई।`
        );
      } else {
        setTranslatedText(
          `## FastAPI Architecture & ASGI Root Setup (${selectedLanguage})\n\nUnlike standard synchronous WSGI microframeworks, FastAPI leverages Starlette and Uvicorn for asynchronous request pipelining.`
        );
      }
      setIsTranslating(false);
    }, 600);
  };

  return (
    <div className="ai-modal-backdrop" onClick={onClose}>
      <div className="ai-assistant-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-header-brand">
            <div className="ai-sparkle-circle">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="ai-modal-title">AI Study Hub & Copilot</h2>
              <p className="ai-modal-subtitle">Lecture: {pageTitle}</p>
            </div>
          </div>

          <button className="ai-modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="ai-modal-tabs">
          <button
            className={`ai-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={13} />
            <span>Chat with Video</span>
          </button>

          <button
            className={`ai-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
            onClick={() => setActiveTab('flashcards')}
          >
            <BrainCircuit size={13} />
            <span>Flashcards</span>
          </button>

          <button
            className={`ai-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            <HelpCircle size={13} />
            <span>Knowledge Check</span>
          </button>

          <button
            className={`ai-tab-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('mindmap')}
          >
            <BookOpen size={13} />
            <span>Concept Map</span>
          </button>

          <button
            className={`ai-tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
            onClick={() => setActiveTab('translate')}
          >
            <Languages size={13} />
            <span>Multi-Lingual</span>
          </button>
        </div>

        {/* Tab 1: Chat with Video */}
        {activeTab === 'chat' && (
          <div className="ai-tab-content chat-content">
            <div className="chat-messages-container">
              {messages.map((m, idx) => (
                <div key={idx} className={`chat-bubble-row ${m.sender === 'user' ? 'user' : 'ai'}`}>
                  {m.sender === 'ai' && (
                    <div className="ai-avatar-tiny">
                      <Sparkles size={12} />
                    </div>
                  )}
                  <div className="chat-message-bubble">{m.text}</div>
                </div>
              ))}
              {isThinking && (
                <div className="chat-bubble-row ai">
                  <div className="ai-avatar-tiny"><Sparkles size={12} /></div>
                  <div className="chat-message-bubble thinking">
                    <Loader2 size={14} className="spinning" />
                    <span>Analyzing lecture transcript...</span>
                  </div>
                </div>
              )}
            </div>

            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Ask anything about the video lecture or code..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                autoFocus
              />
              <button type="submit" className="chat-send-btn" disabled={!inputQuestion.trim() || isThinking}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Flashcards */}
        {activeTab === 'flashcards' && (
          <div className="ai-tab-content flashcards-content">
            <div className="flashcard-counter-row">
              <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
              <span className="flashcard-hint">Click card to flip between Question and Answer</span>
            </div>

            <div
              className={`flashcard-3d-box ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flashcard-face flashcard-front">
                <span className="face-label">QUESTION</span>
                <p className="flashcard-body-text">{flashcards[currentCardIndex].question}</p>
                <span className="flip-hint-badge">Click to reveal answer ↻</span>
              </div>
              <div className="flashcard-face flashcard-back">
                <span className="face-label answer">ANSWER</span>
                <p className="flashcard-body-text">{flashcards[currentCardIndex].answer}</p>
                <span className="flip-hint-badge">Click to return to question ↻</span>
              </div>
            </div>

            <div className="flashcard-controls-row">
              <button
                className="flash-nav-btn"
                disabled={currentCardIndex === 0}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                }}
              >
                Previous
              </button>

              <button
                className="flash-nav-btn primary"
                disabled={currentCardIndex === flashcards.length - 1}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                }}
              >
                Next Card
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Knowledge Check Quiz */}
        {activeTab === 'quiz' && (
          <div className="ai-tab-content quiz-content">
            <div className="quiz-header-status">
              <span>Test your understanding of the concepts covered in this lecture.</span>
              {quizSubmitted && (
                <span className="quiz-score-badge">
                  Score: {calculateScore()} / {quizQuestions.length}
                </span>
              )}
            </div>

            <div className="quiz-questions-list">
              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="quiz-question-card">
                  <h4 className="quiz-q-title">
                    {qIdx + 1}. {q.question}
                  </h4>
                  <div className="quiz-options-group">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      const isCorrect = q.correct === optIdx;
                      let optionClass = '';
                      if (quizSubmitted) {
                        if (isCorrect) optionClass = 'correct';
                        else if (isSelected) optionClass = 'wrong';
                      } else if (isSelected) {
                        optionClass = 'selected';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`quiz-option-pill ${optionClass}`}
                          onClick={() => handleSelectOption(qIdx, optIdx)}
                        >
                          <span className="opt-letter">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="opt-text">{opt}</span>
                          {quizSubmitted && isCorrect && (
                            <CheckCircle size={14} className="check-icon" />
                          )}
                          {quizSubmitted && isSelected && !isCorrect && (
                            <XCircle size={14} className="wrong-icon" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {quizSubmitted && (
                    <div className="quiz-explanation-box">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="quiz-actions-footer">
              {!quizSubmitted ? (
                <button
                  className="quiz-submit-btn"
                  onClick={() => setQuizSubmitted(true)}
                  disabled={Object.keys(selectedAnswers).length === 0}
                >
                  Submit Answers
                </button>
              ) : (
                <button
                  className="quiz-submit-btn retry"
                  onClick={() => {
                    setSelectedAnswers({});
                    setQuizSubmitted(false);
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Retry Quiz</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Mind Map / Visual Concept Tree */}
        {activeTab === 'mindmap' && (
          <div className="ai-tab-content mindmap-content">
            <div className="concept-map-container">
              <div className="map-node root-node">
                <span className="node-title">FastAPI Architecture</span>
                <span className="node-badge">Core Subject</span>
              </div>

              <div className="map-branches-row">
                <div className="map-branch-col">
                  <div className="map-node branch-node">
                    <span>1. ASGI Runtime</span>
                  </div>
                  <div className="map-leaves-col">
                    <div className="map-leaf-node">Uvicorn Server</div>
                    <div className="map-leaf-node">Starlette Base</div>
                    <div className="map-leaf-node">Asyncio Loop</div>
                  </div>
                </div>

                <div className="map-branch-col">
                  <div className="map-node branch-node highlight">
                    <span>2. Pydantic Engine</span>
                  </div>
                  <div className="map-leaves-col">
                    <div className="map-leaf-node">Schema Validation</div>
                    <div className="map-leaf-node">Type Hints & IDE</div>
                    <div className="map-leaf-node">JSON Serialization</div>
                  </div>
                </div>

                <div className="map-branch-col">
                  <div className="map-node branch-node">
                    <span>3. Auto OpenAPI</span>
                  </div>
                  <div className="map-leaves-col">
                    <div className="map-leaf-node">Swagger UI (/docs)</div>
                    <div className="map-leaf-node">ReDoc UI (/redoc)</div>
                    <div className="map-leaf-node">Client SDK Export</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Multi-Lingual Translation */}
        {activeTab === 'translate' && (
          <div className="ai-tab-content translate-content">
            <div className="translate-controls-bar">
              <div className="select-lang-group">
                <label>Translate Notes into:</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="lang-select-dropdown"
                >
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                </select>
              </div>

              <button
                className="translate-btn"
                onClick={handleTranslateNotes}
                disabled={isTranslating}
              >
                {isTranslating ? <Loader2 size={14} className="spinning" /> : <Languages size={14} />}
                <span>{isTranslating ? 'Translating...' : 'Translate Notes'}</span>
              </button>
            </div>

            <div className="translated-output-box">
              {translatedText ? (
                <div className="translated-text-display">
                  <pre>{translatedText}</pre>
                </div>
              ) : (
                <div className="translate-placeholder">
                  <Languages size={32} className="faint-icon" />
                  <p>Choose a target language and click "Translate Notes" to generate multi-lingual study notes.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
