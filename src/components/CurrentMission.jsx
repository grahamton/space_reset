import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, Clock, SkipForward, Plus, Layers } from 'lucide-react';
import { saveTimer, loadTimer } from '../modules/storageModule';
import { primeAudioContext, fireTimesUpAlerts } from '../modules/timerAlerts';

// Keyed by MISSION_TYPES; the schema guarantees `type` is one of them.
const TYPE_BADGE_CLASSES = {
  trash: 'bg-rose-100 text-rose-800 border-rose-200',
  laundry: 'bg-blue-100 text-blue-800 border-blue-200',
  dishes: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  clear: 'bg-amber-100 text-amber-800 border-amber-200',
  organize: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

const CurrentMission = ({
  mission,
  onComplete,
  onSkip,
  totalMissions,
  currentIndex,
  queueLength
}) => {
  const [timeLeft, setTimeLeft] = useState(mission.time || 180);
  const [isActive, setIsActive] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  // 'counting' - normal countdown. 'timesUp' - zero reached, awaiting a
  // choice. 'overtime' - "Keep going" was chosen; counting up, no deadline.
  const [phase, setPhase] = useState('counting');
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  // Guards the zero-crossing alert so it fires once per crossing: not again
  // on re-render, and not on mount when reloading an already-expired timer
  // (that branch below never calls fireTimesUpAlerts). Reset when a fresh
  // countdown starts (new mission, or "More time").
  const alertedRef = useRef(false);
  const titleRef = useRef(null);
  const isFirstMission = useRef(true);

  // Restore this mission's own timer, or start a fresh time box.
  useEffect(() => {
    alertedRef.current = false;
    const saved = loadTimer(mission.id);

    if (saved?.phase === 'overtime') {
      setPhase('overtime');
      setOvertimeSeconds(saved.timeLeft);
      setIsActive(saved.isActive);
      setTimeLeft(0);
    } else if (saved?.phase === 'timesUp') {
      // Reached zero (possibly while the tab was closed). Show the prompt,
      // but never blast a sound/notification for a crossing that already
      // happened out of view.
      setPhase('timesUp');
      setTimeLeft(0);
      setIsActive(false);
    } else if (saved) {
      setPhase('counting');
      setTimeLeft(saved.timeLeft);
      setIsActive(saved.isActive);
    } else {
      setPhase('counting');
      setTimeLeft(mission.time || 180);
      setIsActive(false);
    }
    setIsFinishing(false);
  }, [mission.id, mission.time]);

  // After Done or Skip the buttons that had focus are re-rendered for a new
  // mission, so move focus to its title: screen readers announce it, and
  // keyboard users aren't dropped back at the top of the page.
  useEffect(() => {
    if (isFirstMission.current) {
      isFirstMission.current = false;
      return;
    }
    titleRef.current?.focus({ preventScroll: true });
  }, [mission.id]);

  // Countdown, while there's a deadline. A functional update so the
  // interval survives without needing a render in between each tick.
  useEffect(() => {
    let interval = null;

    if (phase === 'counting' && isActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            saveTimer(mission.id, 0, false, 'timesUp');
            setIsActive(false);
            setPhase('timesUp');
            if (!alertedRef.current) {
              alertedRef.current = true;
              fireTimesUpAlerts(mission.title);
            }
            return 0;
          }
          saveTimer(mission.id, newTime, true);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, isActive, mission.id, mission.title]);

  // Overtime counts up instead, same functional-update shape.
  useEffect(() => {
    let interval = null;

    if (phase === 'overtime' && isActive) {
      interval = setInterval(() => {
        setOvertimeSeconds((prev) => {
          const next = prev + 1;
          saveTimer(mission.id, next, true, 'overtime');
          return next;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, isActive, mission.id]);

  const handleComplete = () => {
    setIsFinishing(true);
    saveTimer(mission.id, 0, false, 'done');
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    setIsFinishing(true);
    saveTimer(mission.id, 0, false, 'done');
    setTimeout(onSkip, 300);
  };

  const toggleTimer = () => {
    const newActive = !isActive;
    // Starting the timer is a user gesture - the best (and maybe only)
    // chance to unlock audio before zero is reached on its own.
    if (newActive) primeAudioContext();
    setIsActive(newActive);
    if (phase === 'overtime') saveTimer(mission.id, overtimeSeconds, newActive, 'overtime');
    else saveTimer(mission.id, timeLeft, newActive);
  };

  const addOneMinute = () => {
    const newTime = timeLeft + 60;
    setTimeLeft(newTime);
    saveTimer(mission.id, newTime, isActive);
  };

  // "Keep going": dismiss the prompt, no more deadline, count up instead.
  const handleKeepGoing = () => {
    setPhase('overtime');
    setOvertimeSeconds(0);
    setIsActive(true);
    saveTimer(mission.id, 0, true, 'overtime');
  };

  // "More time": add minutes and restart the countdown.
  const handleMoreTime = (minutes) => {
    const newTime = minutes * 60;
    alertedRef.current = false;
    setPhase('counting');
    setOvertimeSeconds(0);
    setTimeLeft(newTime);
    setIsActive(true);
    primeAudioContext();
    saveTimer(mission.id, newTime, true);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const themeClass = TYPE_BADGE_CLASSES[mission.type] || TYPE_BADGE_CLASSES.organize;
  const remainingCards = queueLength - currentIndex - 1;

  return (
    // flex-1, not h-full: the coach note can sit above this, and 100% height
    // pushed Skip/Done off the bottom of the screen. Long mission text scrolls
    // inside the card; below min-h the card stops shrinking and <main> scrolls,
    // so the text never collapses to nothing on a short screen.
    <div className="w-full max-w-md mx-auto p-4 flex flex-col flex-1 min-h-[31rem]">
      <div className="flex justify-between items-center mb-4 px-1 shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider">
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
          {/* Focusable so keyboard users can scroll a long mission. */}
          <div
            className="flex-1 overflow-y-auto pr-1 min-h-0 mb-4 rounded-lg"
            tabIndex={0}
            role="region"
            aria-label="Mission details"
          >
            <div
              className={`inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider mb-3 ${themeClass}`}
            >
              {mission.type || 'Mission'}
            </div>

            <h2
              ref={titleRef}
              tabIndex={-1}
              className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight focus:outline-none"
            >
              {mission.title}
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed mb-6">{mission.description}</p>

            {mission.strategy && (
              <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-indigo-200 mb-2">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Tip</p>
                <p className="text-sm text-gray-700 italic font-medium">"{mission.strategy}"</p>
              </div>
            )}
          </div>

          {/* Fixed Bottom Controls */}
          <div className="shrink-0 space-y-4 bg-white pt-2 border-t border-gray-50">
            {phase === 'counting' && (
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase">Timer</span>
                  <button
                    onClick={addOneMinute}
                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-100 px-3 min-h-11 -my-2 -mr-2 rounded-lg flex items-center gap-1 transition-colors"
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
            )}

            {phase === 'timesUp' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center space-y-3">
                <div>
                  <p className="text-sm font-extrabold text-indigo-900">Time's up on this one.</p>
                  <p className="text-xs text-indigo-700 mt-1">
                    No rush - keep going, grab more time, or call it Done below.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleKeepGoing}
                    className="px-3 py-2.5 bg-white text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
                    aria-label="Keep going without a deadline"
                  >
                    Keep going
                  </button>
                  <button
                    onClick={() => handleMoreTime(5)}
                    className="px-3 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
                    aria-label="Add 5 more minutes and restart the timer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" /> 5 min
                  </button>
                </div>
              </div>
            )}

            {phase === 'overtime' && (
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Overtime</p>
                <div
                  role="timer"
                  className="text-4xl font-mono font-bold tracking-tighter text-indigo-500"
                >
                  +{formatTime(overtimeSeconds)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Keep going as long as you need.</p>
              </div>
            )}

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 hover:text-gray-700 transition-colors flex flex-col items-center justify-center gap-1 text-xs"
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
