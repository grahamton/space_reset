import React, { useState, useEffect } from 'react';
import { PERSONAS, DEFAULT_PERSONA } from './config/personas';
import { saveSession, loadSession, clearSession, hasSession } from './modules/storageModule';
import { visionModule, DEFAULT_FALLBACK_DATA } from './modules/visionModule';

// Component imports
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import UploadAndAnalyze from './components/UploadAndAnalyze';
import AnalyzingState from './components/AnalyzingState';
import CurrentMission from './components/CurrentMission';
import CompletionScreen from './components/CompletionScreen';
import SessionSummaryDrawer from './components/SessionSummaryDrawer';

// ==========================================
// MISSION CONTROL HOOK
// ==========================================
const useMissionControl = (apiKey, selectedPersonaId) => {
  const [sessionState, setSessionState] = useState(() => {
    // Try to restore session on mount
    const saved = loadSession();
    return saved || {
      status: 'idle',
      missionQueue: [],
      currentMissionIndex: 0,
      completedCount: 0,
      error: null
    };
  });

  const startAnalysis = async (file) => {
    if (!apiKey) {
      setSessionState((prev) => ({
        ...prev,
        error: 'Missing API Key! Tap the gear icon to add it.'
      }));
      return;
    }

    setSessionState((prev) => ({ ...prev, status: 'analyzing', error: null }));
    try {
      const persona = PERSONAS[selectedPersonaId] || PERSONAS[DEFAULT_PERSONA];
      const data = await visionModule.analyzeImage(file, apiKey, persona);
      const queue =
        data.missions && data.missions.length > 0 ? data.missions : DEFAULT_FALLBACK_DATA?.missions || [];

      const newState = {
        status: 'active',
        missionQueue: queue,
        currentMissionIndex: 0,
        completedCount: 0,
        error: null
      };
      setSessionState(newState);
      saveSession(newState);
    } catch (e) {
      setSessionState((prev) => ({ ...prev, status: 'idle', error: 'Connection blip. Try again?' }));
    }
  };

  const completeCurrentMission = () => {
    setSessionState((prev) => {
      const nextIndex = prev.currentMissionIndex + 1;
      const isComplete = nextIndex >= prev.missionQueue.length;
      const newState = {
        ...prev,
        status: isComplete ? 'complete' : 'active',
        currentMissionIndex: nextIndex,
        completedCount: prev.completedCount + 1
      };
      saveSession(newState);
      return newState;
    });
  };

  const skipCurrentMission = () => {
    setSessionState((prev) => {
      const current = prev.missionQueue[prev.currentMissionIndex];
      const newQueue = [...prev.missionQueue];
      newQueue.splice(prev.currentMissionIndex, 1);
      newQueue.push(current);
      const newState = { ...prev, missionQueue: newQueue };
      saveSession(newState);
      return newState;
    });
  };

  const resetSession = () => {
    const newState = {
      status: 'idle',
      missionQueue: [],
      currentMissionIndex: 0,
      completedCount: 0,
      error: null
    };
    setSessionState(newState);
    clearSession();
  };

  const resumeSession = () => {
    const saved = loadSession();
    if (saved) {
      setSessionState(saved);
    }
  };

  const getCurrentMission = () => {
    if (sessionState.missionQueue.length === 0) return null;
    if (sessionState.currentMissionIndex >= sessionState.missionQueue.length) return null;
    return sessionState.missionQueue[sessionState.currentMissionIndex];
  };

  return {
    sessionState,
    startAnalysis,
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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    () => localStorage.getItem('selected_persona_id') || DEFAULT_PERSONA
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const saveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const savePersona = (id) => {
    localStorage.setItem('selected_persona_id', id);
    setSelectedPersonaId(id);
  };

  const { sessionState, startAnalysis, completeCurrentMission, skipCurrentMission, resetSession, resumeSession, getCurrentMission } =
    useMissionControl(apiKey, selectedPersonaId);

  const currentMission = getCurrentMission();
  const sessionHasData = hasSession();

  return (
    <div className="h-[100dvh] bg-white text-gray-900 font-sans flex flex-col overflow-hidden selection:bg-indigo-100">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        sessionStatus={sessionState.status}
        onReset={resetSession}
      />

      <main className="flex-1 relative w-full max-w-md mx-auto bg-white flex flex-col min-h-0">
        {sessionState.status === 'idle' && (
          <UploadAndAnalyze
            onUpload={startAnalysis}
            onResume={resumeSession}
            error={sessionState.error}
            selectedPersonaId={selectedPersonaId}
            onPersonaChange={savePersona}
            hasSession={sessionHasData}
          />
        )}

        {sessionState.status === 'analyzing' && <AnalyzingState />}

        {sessionState.status === 'active' && currentMission && (
          <CurrentMission
            mission={currentMission}
            onComplete={completeCurrentMission}
            onSkip={skipCurrentMission}
            totalMissions={sessionState.missionQueue.length}
            queueLength={sessionState.missionQueue.length}
            currentIndex={sessionState.currentMissionIndex}
          />
        )}

        {sessionState.status === 'complete' && <CompletionScreen onReset={resetSession} />}
      </main>

      {sessionState.missionQueue.length > 0 && sessionState.status !== 'complete' && (
        <SessionSummaryDrawer sessionState={sessionState} />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveKey={saveApiKey}
      />
    </div>
  );
}
