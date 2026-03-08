/**
 * Optimized component exports using React.memo
 * Prevents unnecessary re-renders when parent state changes
 */

import React from 'react';
import Header from './Header';
import SettingsModal from './SettingsModal';
import UploadAndAnalyze from './UploadAndAnalyze';
import AnalyzingState from './AnalyzingState';
import CurrentMission from './CurrentMission';
import CompletionScreen from './CompletionScreen';
import SessionSummaryDrawer from './SessionSummaryDrawer';
import StatsDashboard from './StatsDashboard';
import BeforeAfterComparison from './BeforeAfterComparison';
import SessionHistory from './SessionHistory';
import RoomTypeSelector from './RoomTypeSelector';
import DifficultySelector from './DifficultySelector';

// Memoized Header - only re-renders if props change
export const OptimizedHeader = React.memo(Header, (prevProps, nextProps) => {
  return (
    prevProps.sessionStatus === nextProps.sessionStatus &&
    prevProps.onOpenSettings === nextProps.onOpenSettings &&
    prevProps.onReset === nextProps.onReset
  );
});

// Memoized SettingsModal - only re-renders if open state changes
export const OptimizedSettingsModal = React.memo(SettingsModal, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.apiKey === nextProps.apiKey
  );
});

// Memoized UploadAndAnalyze
export const OptimizedUploadAndAnalyze = React.memo(UploadAndAnalyze);

// Memoized AnalyzingState (stateless, never changes)
export const OptimizedAnalyzingState = React.memo(AnalyzingState);

// Memoized CurrentMission - expensive to render
export const OptimizedCurrentMission = React.memo(CurrentMission, (prevProps, nextProps) => {
  return (
    prevProps.mission?.id === nextProps.mission?.id &&
    prevProps.totalMissions === nextProps.totalMissions &&
    prevProps.currentIndex === nextProps.currentIndex
  );
});

// Memoized CompletionScreen
export const OptimizedCompletionScreen = React.memo(CompletionScreen);

// Memoized SessionSummaryDrawer
export const OptimizedSessionSummaryDrawer = React.memo(SessionSummaryDrawer);

// Memoized StatsDashboard
export const OptimizedStatsDashboard = React.memo(StatsDashboard);

// Memoized BeforeAfterComparison
export const OptimizedBeforeAfterComparison = React.memo(BeforeAfterComparison);

// Memoized SessionHistory
export const OptimizedSessionHistory = React.memo(SessionHistory);

// Memoized RoomTypeSelector
export const OptimizedRoomTypeSelector = React.memo(RoomTypeSelector);

// Memoized DifficultySelector
export const OptimizedDifficultySelector = React.memo(DifficultySelector);
