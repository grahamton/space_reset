import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, Clock, SkipForward, Plus, Layers } from 'lucide-react';
import { saveTimer, loadTimer } from '../modules/storageModule';

const CurrentMission = ({ mission, onComplete, onSkip, totalMissions, currentIndex, queueLength }) => {
  const [timeLeft, setTimeLeft] = useState(mission.time || 180);
  const [isActive, setIsActive] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Restore this mission's own timer, or start a fresh time box.
  useEffect(() => {
    const saved = loadTimer(mission.id);
    if (saved && saved.timeLeft > 0) {
      setTimeLeft(saved.timeLeft);
      setIsActive(saved.isActive);
    } else {
      setTimeLeft(mission.time || 180);
      setIsActive(false);
    }
    setIsFinishing(false);
  }, [mission.id, mission.time]);

  // Timer countdown with proper cleanup
  useEffect(() => {
    let interval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          // Save timer state on every tick
          saveTimer(mission.id, newTime, newTime > 0);
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      saveTimer(mission.id, 0, false);
    }

    // Proper cleanup: always clear interval on unmount or when deps change
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, mission.id]);

  const handleComplete = () => {
    setIsFinishing(true);
    saveTimer(mission.id, 0, false);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsFinishing(true);
    saveTimer(mission.id, 0, false);
    setTimeout(onSkip, 300);
  };

  const toggleTimer = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    saveTimer(mission.id, timeLeft, newActive);
  };

  const addOneMinute = () => {
    const newTime = timeLeft + 60;
    setTimeLeft(newTime);
    saveTimer(mission.id, newTime, isActive);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getColor = (t) => {
    const type = t?.toLowerCase() || '';
    if (type.includes('trash')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (type.includes('laundry')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (type.includes('dish')) return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  const themeClass = getColor(mission.type);
  const remainingCards = queueLength - currentIndex - 1;

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col h-full max-h-full">
      <div className="flex justify-between items-center mb-4 px-1 shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider">
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>{remainingCards > 0 ? `${remainingCards} more after this` : 'Last one'}</span>
        </div>
        <div className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {currentIndex + 1} of {totalMissions}
        </div>
      </div>

      {/* Card Stack Container */}
      <div className="relative flex-1 min-h-0 flex flex-col pb-2">
        {/* Background Cards */}
        {remainingCards > 0 && (
          <div className="absolute top-4 left-4 right-4 bottom-0 bg-gray-100 border border-gray-200 rounded-3xl transform scale-95 -z-10 shadow-sm transition-all"></div>
        )}
        {remainingCards > 1 && (
          <div className="absolute top-8 left-8 right-8 bottom-0 bg-gray-50 border border-gray-100 rounded-3xl transform scale-90 -z-20 shadow-sm transition-all"></div>
        )}

        {/* Active Card */}
        <div
          className={`
            flex-1 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-5 flex flex-col relative overflow-hidden transition-all duration-300
            ${isFinishing ? 'translate-x-full opacity-0 rotate-12' : 'translate-x-0 opacity-100 rotate-0'}
          `}
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 mb-4">
            <div className={`inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider mb-3 ${themeClass}`}>
              {mission.type || 'Mission'}
            </div>

            <h3 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
              {mission.title}
            </h3>

            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              {mission.description}
            </p>

            {mission.strategy && (
              <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-indigo-200 mb-2">
                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Tip</p>
                <p className="text-sm text-gray-700 italic font-medium">"{mission.strategy}"</p>
              </div>
            )}
          </div>

          {/* Fixed Bottom Controls */}
          <div className="shrink-0 space-y-4 bg-white pt-2 border-t border-gray-50">
            <div className="bg-gray-50 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase">Timer</span>
                <button
                  onClick={addOneMinute}
                  className="text-xs font-bold text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                  aria-label="Add 1 minute"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" /> 1 min
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div
                  role="timer"
                  className={`text-4xl font-mono font-bold tracking-tighter transition-colors ${timeLeft < 30 && isActive ? 'text-red-500' : 'text-gray-800'}`}
                >
                  {formatTime(timeLeft)}
                </div>
                <button
                  onClick={toggleTimer}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}
                  aria-label={isActive ? 'Pause timer' : 'Start timer'}
                >
                  {isActive ? (
                    <Clock className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Play className="w-5 h-5 ml-1" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 hover:text-gray-700 transition-colors flex flex-col items-center justify-center gap-1 text-xs"
                aria-label="Skip for now. This mission moves to the back of the stack."
              >
                <SkipForward className="w-5 h-5" aria-hidden="true" />
                Skip
              </button>
              <button
                onClick={handleComplete}
                className="py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-xl shadow-gray-200 hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 text-lg"
                aria-label="Done with this mission"
              >
                <CheckCircle className="w-6 h-6" aria-hidden="true" />
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentMission;
