import React, { useState } from 'react';
import { ChevronLeft, Calendar, Clock, Target } from 'lucide-react';
import { getHistoryFiltered } from '../modules/historyModule';
import { PERSONAS } from '../../shared/personas.js';
import { ROOM_TYPES } from '../../shared/roomTypes.js';

const SessionHistory = ({ onClose }) => {
  const [filter, setFilter] = useState('all');
  const history = getHistoryFiltered({
    completedOnly: filter === 'completed',
    daysBack: filter === 'week' ? 7 : filter === 'month' ? 30 : null
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show display names, not stored ids like 'living_room' or 'drillSergeant'.
  const describeSession = (session) =>
    [ROOM_TYPES[session.roomType]?.name, PERSONAS[session.personaId]?.name]
      .filter(Boolean)
      .join(' · ') || 'Cleaning session';

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  const getCompletionColor = (completed, total) => {
    const rate = (completed / total) * 100;
    if (rate === 100) return 'bg-green-100 text-green-700';
    if (rate >= 75) return 'bg-blue-100 text-blue-700';
    if (rate >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  };

  return (
    <div className="h-[100dvh] bg-white text-gray-900 font-sans flex flex-col overflow-hidden selection:bg-indigo-100">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Past sessions</h1>
      </header>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-100 flex gap-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All' },
          { id: 'week', label: 'Last 7 days' },
          { id: 'month', label: 'Last 30 days' },
          { id: 'completed', label: 'All missions done' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
              <p className="text-gray-500 text-lg">Nothing here yet</p>
              <p className="text-gray-400 text-sm">
                {filter === 'completed' && 'Sessions where you clear every mission show up here.'}
                {filter === 'week' && 'No sessions in the last 7 days. Start one whenever.'}
                {filter === 'month' && 'No sessions in the last 30 days. Start one whenever.'}
                {filter === 'all' && 'Finish a session and it shows up here.'}
              </p>
            </div>
          </div>
        ) : (
          history.map((session) => {
            const completion = session.completedCount / session.missionCount;
            const completionPercent = Math.round(completion * 100);

            return (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                {/* Date and Persona */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-500 uppercase">
                      {formatDate(session.date)}
                    </p>
                    <p className="font-bold text-gray-900 mt-1">{describeSession(session)}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getCompletionColor(session.completedCount, session.missionCount)}`}>
                    {completionPercent}%
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-gray-700">
                      {session.completedCount} of {session.missionCount} done
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-gray-700">{formatTime(session.totalTime || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-gray-700">
                      {new Date(session.timestamp).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2" aria-hidden="true">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  ></div>
                </div>

                {/* Notes or Rating */}
                {session.notes && (
                  <p className="text-xs text-gray-600 mt-3 italic">"{session.notes}"</p>
                )}

                {session.rating && (
                  <div className="flex gap-1 mt-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < session.rating ? 'text-lg' : 'text-lg opacity-30'}>
                        ⭐
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SessionHistory;
