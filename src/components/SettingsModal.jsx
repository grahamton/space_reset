import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import RoomTypeSelector from './RoomTypeSelector';
import DifficultySelector from './DifficultySelector';

/**
 * Session preferences that persist between runs.
 *
 * Persona lives on the idle screen instead — it's the per-session "what voice
 * do I need today" choice, and it belongs next to the camera button.
 */
const SettingsModal = ({
  isOpen,
  onClose,
  roomType,
  onRoomTypeChange,
  difficulty,
  onDifficultyChange
}) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    closeButtonRef.current?.focus();

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 pb-4 shrink-0">
          <h3 id="settings-title" className="text-xl font-bold text-gray-900">
            Settings
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-8">
          <RoomTypeSelector selectedRoomType={roomType} onSelectRoom={onRoomTypeChange} />
          <DifficultySelector
            selectedDifficulty={difficulty}
            onSelectDifficulty={onDifficultyChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
