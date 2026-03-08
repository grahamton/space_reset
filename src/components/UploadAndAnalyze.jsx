import React, { useRef } from 'react';
import { Camera, ImageIcon, AlertCircle, ChevronDown, RotateCcw } from 'lucide-react';
import { PERSONAS } from '../config/personas';
import { getSessionSummary } from '../modules/storageModule';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_DIMENSION = 4000;

const UploadAndAnalyze = ({
  onUpload,
  onResume,
  error,
  selectedPersonaId,
  onPersonaChange,
  hasSession
}) => {
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }

    // Check MIME type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return false;
    }

    return true;
  };

  const validateDimensions = (img) => {
    if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
      alert(
        `Image is too large (${img.width}x${img.height}px). Max dimensions are ${MAX_DIMENSION}x${MAX_DIMENSION}px. Consider resizing.`
      );
      return false;
    }
    return true;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!validateFile(file)) {
      e.target.value = '';
      return;
    }

    // Validate dimensions
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (validateDimensions(img)) {
          onUpload(file);
        }
        e.target.value = '';
      };
      img.onerror = () => {
        alert('Failed to read image. Please try another file.');
        e.target.value = '';
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      alert('Failed to read file.');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const sessionSummary = hasSession ? getSessionSummary() : null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-3 mt-4">
        <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Reset Your Space</h2>
        <p className="text-gray-500 text-lg max-w-xs mx-auto leading-relaxed">
          Don't clean everything.
          <br />
          Just do <span className="text-indigo-600 font-bold">5 Things</span>.
        </p>
      </div>

      {/* Resume Session Button */}
      {hasSession && sessionSummary && (
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-6 py-3 bg-green-50 border-2 border-green-400 text-green-700 rounded-xl font-bold hover:bg-green-100 transition-colors max-w-xs text-center justify-center"
          aria-label={`Resume session with ${sessionSummary.remainingCount} missions remaining`}
        >
          <RotateCcw className="w-5 h-5" />
          <div>
            <div>Resume Session</div>
            <div className="text-xs font-normal">
              {sessionSummary.remainingCount} / {sessionSummary.missionCount} left
            </div>
          </div>
        </button>
      )}

      {/* Persona Selector */}
      <div className="w-full max-w-xs">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
          Vibe Check
        </label>
        <div className="relative">
          <select
            value={selectedPersonaId}
            onChange={(e) => onPersonaChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none text-center cursor-pointer hover:bg-gray-100"
            aria-label="Select cleaning persona style"
          >
            {Object.values(PERSONAS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Camera Button */}
      <div className="relative group cursor-pointer">
        <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <label className="relative w-56 h-56 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 active:scale-95 shadow-2xl shadow-indigo-200 flex flex-col items-center justify-center transition-all cursor-pointer border-4 border-white/30 overflow-hidden">
          <Camera className="w-24 h-24 text-white mb-3 drop-shadow-md" />
          <span className="text-white font-bold text-xl tracking-wider drop-shadow-sm">SNAP PHOTO</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            onChange={handleFile}
            aria-label="Capture photo with camera"
          />
        </label>
      </div>

      {/* Upload from Gallery */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="text-gray-400 hover:text-indigo-600 font-medium flex items-center gap-2 transition-colors py-2 px-4 rounded-full hover:bg-gray-50"
        aria-label="Upload image from gallery"
      >
        <ImageIcon className="w-5 h-5" />
        <span>Upload from Gallery</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </button>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm max-w-xs border border-red-100 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};

export default UploadAndAnalyze;
