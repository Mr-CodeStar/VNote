import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Trash2
} from 'lucide-react';
import * as api from '../services/api';

export default function ApiKeyModal({
  isOpen,
  onClose,
  currentKey = '',
  onSaveKey
}) {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(currentKey || localStorage.getItem('gemini_api_key') || '');
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);
    try {
      const trimmed = apiKeyInput.trim();
      if (onSaveKey) {
        await onSaveKey(trimmed);
      } else {
        await api.saveSetting('gemini_api_key', trimmed);
        if (trimmed) {
          localStorage.setItem('gemini_api_key', trimmed);
        } else {
          localStorage.removeItem('gemini_api_key');
        }
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save Gemini API key.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Please enter an API key to test.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testGeminiApiKey(keyToTest);
      setTestResult({
        success: true,
        message: `Connected successfully! (Model: ${res.modelUsed || 'gemini-3.5-flash'})`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to validate API key with Gemini.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = async () => {
    setApiKeyInput('');
    setTestResult(null);
    setIsSaving(true);
    try {
      if (onSaveKey) {
        await onSaveKey('');
      } else {
        await api.saveSetting('gemini_api_key', '');
        localStorage.removeItem('gemini_api_key');
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to clear API key.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="vnote-modal-overlay" onClick={onClose}>
      <div
        className="vnote-modal-card api-key-modal-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Modal Header */}
        <div className="vnote-modal-header">
          <div className="vnote-modal-title-row">
            <div className="api-key-icon-badge">
              <Key size={18} />
            </div>
            <div>
              <h3 className="vnote-modal-title">Google Gemini API Key</h3>
              <p className="vnote-modal-subtitle">
                Required for Video AI Copilot chat and AI notes generation
              </p>
            </div>
          </div>
          <button
            type="button"
            className="vnote-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="vnote-modal-body">
          <label className="api-key-label" htmlFor="gemini-key-input">
            Enter your API Key
          </label>
          <div className="api-key-input-wrapper">
            <input
              id="gemini-key-input"
              type={showKey ? 'text' : 'password'}
              className="api-key-input"
              placeholder="Paste your Gemini API key (starts with AIza...)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />
            <button
              type="button"
              className="api-key-toggle-btn"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Test Status Messages */}
          {testResult && (
            <div
              className={`api-key-status-banner ${
                testResult.success ? 'status-success' : 'status-error'
              }`}
            >
              {testResult.success ? (
                <Check size={16} className="status-icon" />
              ) : (
                <AlertCircle size={16} className="status-icon" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="api-key-status-banner status-success">
              <Check size={16} className="status-icon" />
              <span>API key saved successfully to your database!</span>
            </div>
          )}

          {/* Helpful Help Box */}
          <div className="api-key-helper-box">
            <div className="helper-box-top">
              <Sparkles size={14} className="helper-sparkle" />
              <span>Don't have an API key?</span>
            </div>
            <p className="helper-box-text">
              You can get a free Google Gemini API key directly from Google AI Studio.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="api-key-external-link"
              onClick={(e) => {
                if (window.electronAPI?.openExternal) {
                  e.preventDefault();
                  window.electronAPI.openExternal('https://aistudio.google.com/app/apikey');
                }
              }}
            >
              <span>Get free Gemini API Key</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="vnote-modal-footer">
          {currentKey && (
            <button
              type="button"
              className="api-key-btn-danger"
              onClick={handleClear}
              disabled={isSaving || isTesting}
              title="Remove current API key"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}

          <div className="modal-footer-right-actions">
            <button
              type="button"
              className="api-key-btn-secondary"
              onClick={handleTestKey}
              disabled={isTesting || !apiKeyInput.trim()}
            >
              {isTesting ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="api-key-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save Key</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
