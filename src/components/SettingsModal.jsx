import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, apiKey, onSaveKey }) => {
  const [key, setKey] = useState(apiKey);
  const inputRef = useRef(null);
  const saveButtonRef = useRef(null);

  useEffect(() => {
    setKey(apiKey);
  }, [apiKey]);

  // Focus management and Escape key handler
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 id="settings-title" className="text-xl font-bold text-gray-900">
            Settings
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key
            </label>
            <input
              id="api-key-input"
              ref={inputRef}
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-2">Your key is stored locally on your device.</p>
          </div>

          <button
            ref={saveButtonRef}
            onClick={() => {
              onSaveKey(key.trim());
              onClose();
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            aria-label="Save API key"
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
