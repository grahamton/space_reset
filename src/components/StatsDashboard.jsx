import React from 'react';
import { Flame, Clock, Target, Star, TrendingUp } from 'lucide-react';
import { getStatsSummary } from '../modules/historyModule';

const StatsDashboard = () => {
  const stats = getStatsSummary();

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Your Progress</h2>
        <p className="text-gray-500">Keep up the momentum!</p>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="text-sm font-bold text-gray-600 uppercase">Current Streak</span>
          </div>
        </div>
        <div className="text-5xl font-black text-orange-600">{stats.currentStreak}</div>
        <p className="text-xs text-gray-600 mt-2">
          {stats.currentStreak === 0
            ? 'Start a session to build your streak!'
            : `Keep it going! Your record is ${stats.maxStreak} days`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sessions */}
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">Sessions</span>
          </div>
          <div className="text-3xl font-bold text-indigo-600">{stats.totalSessions}</div>
          <p className="text-xs text-gray-600 mt-1">
            {stats.completedSessions} completed
          </p>
        </div>

        {/* Time */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">Total Time</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{formatTime(stats.totalTime)}</div>
          <p className="text-xs text-gray-600 mt-1">spent cleaning</p>
        </div>

        {/* Missions */}
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">Missions</span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats.totalMissionsCompleted}
          </div>
          <p className="text-xs text-gray-600 mt-1">completed</p>
        </div>

        {/* Completion Rate */}
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-bold text-gray-600 uppercase">Rate</span>
          </div>
          <div className="text-3xl font-bold text-purple-600">{stats.completionRate}%</div>
          <p className="text-xs text-gray-600 mt-1">completion</p>
        </div>
      </div>

      {/* Achievements */}
      {stats.achievements > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏆</span>
            <div>
              <h3 className="font-bold text-gray-900">Achievements</h3>
              <p className="text-xs text-gray-600">{stats.achievements} unlocked</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {stats.unlockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="text-center p-3 bg-white rounded-xl border border-yellow-100 hover:shadow-md transition-shadow"
                title={achievement.name}
              >
                <div className="text-3xl mb-1">{achievement.icon}</div>
                <p className="text-xs font-bold text-gray-700 line-clamp-2">
                  {achievement.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement */}
      {stats.totalSessions === 0 && (
        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-200 text-center">
          <p className="text-gray-700 font-medium mb-3">
            Start your first session to unlock achievements and build your streak! 🚀
          </p>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
