import React, { useState } from 'react';
import { DEFAULT_PERSONA } from '../shared/personas.js';
import { DEFAULT_DIFFICULTY, DEFAULT_MISSION_COUNT } from '../shared/roomTypes.js';
import {
  saveSession,
  loadSession,
  clearSession,
  hasSession,
  loadPreference,
  savePreference
} from './modules/storageModule';
import { visionModule, getFallbackMissions } from './modules/visionModule';
import { saveSessionToHistory, updateStats, loadStats } from './modules/historyModule';

// Component imports
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import UploadAndAnalyze from './components/UploadAndAnalyze';
import AnalyzingState from './components/AnalyzingState';
import CurrentMission from './components/CurrentMission';
import CoachNote from './components/CoachNote';
import CompletionScreen from './components/CompletionScreen';
import SessionSummaryDrawer from './components/SessionSummaryDrawer';
import StatsDashboard from './components/StatsDashboard';
import SessionHistory from './components/SessionHistory';

const emptySession = () => ({
  status: 'idle',
  missionQueue: [],
  currentMissionIndex: 0,
  completedCount: 0,
  consecutiveSkips: 0,
  startedAt: null,
  error: null,
  // A friendly, non-error notice shown on the upload screen (e.g. a 'retake' note).
  info: null,
  // The persona's in-character line for this session ('ok'/'tidy'), shown above
  // the current mission. Persisted with the session so a refresh keeps it.
  note: null
});

// ==========================================
// MISSION CONTROL HOOK
// ==========================================
export const useMissionControl = ({ personaId, roomType, difficulty, missionCount }) => {
  const [sessionState, setSessionState] = useState(() => loadSession() || emptySession());

  const beginSession = (missions, note = null) => {
    const newState = {
      ...emptySession(),
      status: 'active',
      missionQueue: missions,
      startedAt: Date.now(),
      note
    };
    setSessionState(newState);
    saveSession(newState);
  };

  const startAnalysis = async (file) => {
    setSessionState((prev) => ({ ...prev, status: 'analyzing', error: null, info: null }));
    try {
      const {
        status: apiStatus,
        note,
        missions
      } = await visionModule.analyzeImage(file, {
        personaId,
        roomType,
        difficulty,
        missionCount
      });

      // 'retake' never has missions to show. 'tidy' can come back with none too
      // (nothing to clean) — treat that the same way rather than starting an
      // empty session: back to the upload screen with the persona's note.
      const nothingToDo = apiStatus === 'retake' || (apiStatus === 'tidy' && missions.length === 0);
      if (nothingToDo) {
        setSessionState((prev) => ({ ...prev, status: 'idle', error: null, info: note }));
        return;
      }

      beginSession(missions, note);
    } catch (e) {
      // Surface the real reason and let the user choose the offline missions,
      // rather than silently swapping them in.
      setSessionState((prev) => ({ ...prev, status: 'idle', error: e.message, info: null }));
    }
  };

  /** Start with the built-in missions after an analysis failure. */
  const startFallbackSession = () => {
    beginSession(getFallbackMissions(difficulty, missionCount).missions);
  };

  /** Record the finished session once, at the active -> complete transition. */
  const recordCompletion = (state) => {
    const totalTime = state.startedAt ? Math.round((Date.now() - state.startedAt) / 1000) : 0;
    saveSessionToHistory({
      personaId,
      roomType,
      difficulty,
      missionCount: state.missionQueue.length,
      completedCount: state.completedCount,
      totalTime
    });
    updateStats();
  };

  const completeCurrentMission = () => {
    setSessionState((prev) => {
      const nextIndex = prev.currentMissionIndex + 1;
      const isComplete = nextIndex >= prev.missionQueue.length;
      const newState = {
        ...prev,
        status: isComplete ? 'complete' : 'active',
        currentMissionIndex: nextIndex,
        completedCount: prev.completedCount + 1,
        // Progress means the remaining missions deserve another look.
        consecutiveSkips: 0
      };
      saveSession(newState);
      if (isComplete) recordCompletion(newState);
      return newState;
    });
  };

  const skipCurrentMission = () => {
    setSessionState((prev) => {
      const current = prev.missionQueue[prev.currentMissionIndex];
      const newQueue = [...prev.missionQueue];
      newQueue.splice(prev.currentMissionIndex, 1);
      newQueue.push(current);

      // Skipping rotates the queue without advancing the index, so without a
      // cycle guard the last mission could be deferred forever and 'complete'
      // was unreachable except by finishing every mission.
      const remaining = prev.missionQueue.length - prev.completedCount;
      const consecutiveSkips = prev.consecutiveSkips + 1;
      const seenThemAll = consecutiveSkips >= remaining;

      const newState = {
        ...prev,
        missionQueue: newQueue,
        consecutiveSkips,
        status: seenThemAll ? 'complete' : 'active'
      };
      saveSession(newState);
      if (seenThemAll) recordCompletion(newState);
      return newState;
    });
  };

  const resetSession = () => {
    setSessionState(emptySession());
    clearSession();
  };

  const resumeSession = () => {
    const saved = loadSession();
    if (saved) setSessionState(saved);
  };

  const getCurrentMission = () => {
    const { missionQueue, currentMissionIndex } = sessionState;
    if (currentMissionIndex >= missionQueue.length) return null;
    return missionQueue[currentMissionIndex] || null;
  };

  return {
    sessionState,
    startAnalysis,
    startFallbackSession,
    completeCurrentMission,
    skipCurrentMission,
    resetSession,
    resumeSession,
    getCurrentMission
  };
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [personaId, setPersonaId] = useState(
    () => loadPreference('SELECTED_PERSONA_ID', DEFAULT_PERSONA) || DEFAULT_PERSONA
  );
  const [roomType, setRoomType] = useState(() => loadPreference('ROOM_TYPE', 'other'));
  const [difficulty, setDifficulty] = useState(
    () => loadPreference('DIFFICULTY', DEFAULT_DIFFICULTY) || DEFAULT_DIFFICULTY
  );
  const [missionCount, setMissionCount] = useState(
    () => loadPreference('MISSION_COUNT', DEFAULT_MISSION_COUNT) || DEFAULT_MISSION_COUNT
  );
  const [streakIncludesSkips, setStreakIncludesSkips] = useState(
    () => loadPreference('STREAK_INCLUDES_SKIPS', 'true') !== 'false'
  );
  const [activePanel, setActivePanel] = useState(null); // 'settings' | 'stats' | 'history'

  const persistPreference = (key, value, setter) => {
    savePreference(key, value);
    setter(value);
  };

  const {
    sessionState,
    startAnalysis,
    startFallbackSession,
    completeCurrentMission,
    skipCurrentMission,
    resetSession,
    resumeSession,
    getCurrentMission
  } = useMissionControl({ personaId, roomType, difficulty, missionCount });

  const currentMission = getCurrentMission();
  const sessionHasData = hasSession();
  const { currentStreak } = loadStats();

  const closePanel = () => setActivePanel(null);

  if (activePanel === 'history') {
    return (
      <div className="h-[100dvh] bg-white text-gray-900 font-sans overflow-y-auto">
        <SessionHistory onClose={closePanel} />
      </div>
    );
  }

  if (activePanel === 'stats') {
    return (
      <div className="h-[100dvh] bg-white text-gray-900 font-sans overflow-y-auto">
        <StatsDashboard />
        <div className="max-w-md mx-auto px-6 pb-8 space-y-3">
          <button
            onClick={() => setActivePanel('history')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            See past sessions
          </button>
          <button
            onClick={closePanel}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-white text-gray-900 font-sans flex flex-col overflow-hidden selection:bg-indigo-100">
      <Header
        onOpenSettings={() => setActivePanel('settings')}
        onOpenStats={() => setActivePanel('stats')}
        sessionStatus={sessionState.status}
        onReset={resetSession}
        streak={currentStreak}
      />

      <main className="flex-1 relative w-full max-w-md mx-auto bg-white flex flex-col min-h-0">
        {sessionState.status === 'idle' && (
          <UploadAndAnalyze
            onUpload={startAnalysis}
            onResume={resumeSession}
            onUseFallback={startFallbackSession}
            error={sessionState.error}
            info={sessionState.info}
            selectedPersonaId={personaId}
            onPersonaChange={(id) => persistPreference('SELECTED_PERSONA_ID', id, setPersonaId)}
            hasSession={sessionHasData}
          />
        )}

        {sessionState.status === 'analyzing' && <AnalyzingState />}

        {sessionState.status === 'active' && currentMission && (
          <>
            <CoachNote note={sessionState.note} />
            <CurrentMission
              mission={currentMission}
              onComplete={completeCurrentMission}
              onSkip={skipCurrentMission}
              totalMissions={sessionState.missionQueue.length}
              queueLength={sessionState.missionQueue.length}
              currentIndex={sessionState.currentMissionIndex}
            />
          </>
        )}

        {sessionState.status === 'complete' && <CompletionScreen onReset={resetSession} />}
      </main>

      {sessionState.missionQueue.length > 0 && sessionState.status !== 'complete' && (
        <SessionSummaryDrawer sessionState={sessionState} />
      )}

      <SettingsModal
        isOpen={activePanel === 'settings'}
        onClose={closePanel}
        roomType={roomType}
        onRoomTypeChange={(id) => persistPreference('ROOM_TYPE', id, setRoomType)}
        difficulty={difficulty}
        onDifficultyChange={(id) => persistPreference('DIFFICULTY', id, setDifficulty)}
        missionCount={missionCount}
        onMissionCountChange={(value) => persistPreference('MISSION_COUNT', value, setMissionCount)}
        streakIncludesSkips={streakIncludesSkips}
        onStreakIncludesSkipsChange={(value) =>
          persistPreference(
            'STREAK_INCLUDES_SKIPS',
            value ? 'true' : 'false',
            setStreakIncludesSkips
          )
        }
      />
    </div>
  );
}
