import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImageIcon, AlertCircle, ChevronDown, RotateCcw } from 'lucide-react';
import { PERSONAS } from '../../shared/personas.js';
import { getSessionSummary } from '../modules/storageModule';

// Photos are shrunk before upload (in visionModule), so this only guards against decoding
// something absurd on a phone. Full-res camera shots are well under it.
const MAX_FILE_SIZE_MB = 40;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const UploadAndAnalyze = ({
  onUpload,
  onResume,
  onUseFallback,
  error,
  info,
  selectedPersonaId,
  onPersonaChange,
  hasSession
}) => {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const infoRef = useRef(null);
  const [validationError, setValidationError] = useState(null);

  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB, and the limit is ${MAX_FILE_SIZE_MB} MB. Try a different photo.`
      );
      return false;
    }

    // Check MIME type
    if (!file.type.startsWith('image/')) {
      setValidationError("That file isn't a photo. Pick an image instead.");
      return false;
    }

    return true;
  };

  // Synchronous on purpose: hand the photo straight to onUpload so the
  // analyzing screen shows the moment the camera returns. Resizing happens
  // behind that screen. Clearing the input marks the photo as handled.
  const takeFile = (input) => {
    const file = input?.files?.[0];
    if (!file) return;
    input.value = '';

    setValidationError(null);
    if (validateFile(file)) onUpload(file);
  };

  const handleFile = (e) => takeFile(e.target);

  // Android Chrome sometimes skips the change event when the camera app hands
  // back a photo, until the next tap on the page. When the page comes back
  // into view, pick up any photo still sitting unhandled in an input.
  useEffect(() => {
    let timer;
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      // Give a change event that is on its way a moment to arrive first.
      timer = setTimeout(() => {
        takeFile(cameraInputRef.current);
        takeFile(fileInputRef.current);
      }, 500);
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  });

  // A retake/tidy note lands back on this screen, often below the fold on a
  // phone; bring it into view so it's clear the photo was looked at.
  useEffect(() => {
    if (info) infoRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [info]);

  const sessionSummary = hasSession ? getSessionSummary() : null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-3 mt-4">
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Reset Your Space</h2>
        <p className="text-gray-500 text-lg max-w-xs mx-auto leading-relaxed">
          Don't clean everything.
          <br />
          Just <span className="text-indigo-600 font-bold">start somewhere</span>.
        </p>
      </div>

      {/* Resume Session Button */}
      {hasSession && sessionSummary && (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-6 py-3 bg-green-50 border-2 border-green-400 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors max-w-xs text-center justify-center"
          aria-label={`Pick up where you left off: ${sessionSummary.remainingCount} of ${sessionSummary.missionCount} missions left`}
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" />
          <div>
            <div>Pick up where you left off</div>
            <div className="text-xs font-normal">
              {sessionSummary.remainingCount} of {sessionSummary.missionCount} missions left
            </div>
          </div>
        </button>
      )}

      {/* Persona Selector */}
      <div className="w-full max-w-xs">
        <label
          htmlFor="persona-select"
          className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center"
        >
          Vibe Check
        </label>
        <div className="relative">
          <select
            id="persona-select"
            value={selectedPersonaId}
            onChange={(e) => onPersonaChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none text-center cursor-pointer hover:bg-gray-100"
            aria-label="Vibe check: pick your coach's voice"
          >
            {Object.values(PERSONAS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Camera Button */}
      <div className="relative group cursor-pointer">
        <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <label className="relative w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-95 shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center transition-all cursor-pointer border-4 border-white/30 overflow-hidden">
          <Camera className="w-24 h-24 text-white mb-3 drop-shadow-md" aria-hidden="true" />
          <span className="text-white font-bold text-xl tracking-wider drop-shadow-sm">
            SNAP THE ROOM
          </span>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={handleFile}
            aria-label="Take a photo of the room"
          />
        </label>
      </div>

      {/* Upload from Gallery */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors min-h-11 px-4 rounded-full hover:bg-gray-50"
        aria-label="Choose a photo from your device"
      >
        <ImageIcon className="w-5 h-5" aria-hidden="true" />
        <span>Or choose a saved photo</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </button>

      {/* Info Display (e.g. a friendly "try another photo" note) — not an error */}
      {info && !error && !validationError && (
        <div
          ref={infoRef}
          className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-4 py-3 rounded-xl text-sm border border-indigo-100 shadow-sm max-w-xs w-full scroll-mb-4"
          role="status"
        >
          <Camera className="w-5 h-5 shrink-0" aria-hidden="true" />
          {info}
        </div>
      )}

      {/* Error Display */}
      {(error || validationError) && (
        <div className="max-w-xs w-full space-y-2">
          <div
            className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm border border-red-100 shadow-sm"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            {validationError || error}
          </div>
          {/* Ready-made missions help when analysis failed, not when the file was rejected. */}
          {error && !validationError && onUseFallback && (
            <button
              onClick={onUseFallback}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              Use ready-made missions instead
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadAndAnalyze;
