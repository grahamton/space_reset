import React, { useEffect, useRef } from 'react';
import { X, Flame } from 'lucide-react';
import RoomTypeSelector from './RoomTypeSelector';
import DifficultySelector from './DifficultySelector';
import MissionCountSelector from './MissionCountSelector';
import TimerAlertSettings from './TimerAlertSettings';

/**
 * Session preferences that persist between runs.
 *
 * Persona lives on the idle screen instead — it's the per-session "what voice
 * do I need today" choice, and it belongs next to the camera button.
 *
 * Sectioned: Room, Energy (difficulty), Missions (count), Streak, Timer.
 */
const SettingsModal = ({
  isOpen,
  onClose,
  roomType,
  onRoomTypeChange,
  difficulty,
  onDifficultyChange,
  missionCount,
  onMissionCountChange,
  streakIncludesSkips,
  onStreakIncludesSkipsChange
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
            aria-label="Close settings"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-8">
          {/* Room */}
          <RoomTypeSelector selectedRoomType={roomType} onSelectRoom={onRoomTypeChange} />

          {/* Energy (difficulty) */}
          <DifficultySelector
            selectedDifficulty={difficulty}
            onSelectDifficulty={onDifficultyChange}
          />

          {/* Missions (count) */}
          <MissionCountSelector
            selectedMissionCount={missionCount}
            onSelectMissionCount={onMissionCountChange}
          />

          {/* Streak */}
          <div className="w-full space-y-3">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Streak</h3>
            </div>
            <button
              type="button"
              onClick={() => onStreakIncludesSkipsChange(!streakIncludesSkips)}
              aria-pressed={streakIncludesSkips}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-start gap-3 ${
                streakIncludesSkips
                  ? 'border-indigo-600 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Flame
                className={`w-6 h-6 mt-0.5 shrink-0 ${
                  streakIncludesSkips ? 'text-orange-500' : 'text-gray-400'
                }`}
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-gray-900">Skipped missions still count</p>
                <p className="text-sm text-gray-600">
                  {streakIncludesSkips
                    ? 'On: finishing at least one mission in a session keeps your streak alive.'
                    : 'Off: every mission in a session has to be done to keep your streak alive.'}
                </p>
              </div>
            </button>
          </div>

          <TimerAlertSettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
