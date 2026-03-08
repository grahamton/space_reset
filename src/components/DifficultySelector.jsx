import React from 'react';
import { getAllDifficulties } from '../modules/configModule';
import { Zap, Target, Flame } from 'lucide-react';

const DifficultySelector = ({ selectedDifficulty, onSelectDifficulty }) => {
  const difficulties = getAllDifficulties();

  const getIcon = (id) => {
    if (id === 'easy') return <Zap className="w-6 h-6" />;
    if (id === 'hard') return <Flame className="w-6 h-6" />;
    return <Target className="w-6 h-6" />;
  };

  const getColor = (id) => {
    if (id === 'easy') return 'from-green-400 to-emerald-500';
    if (id === 'hard') return 'from-red-400 to-orange-500';
    return 'from-indigo-400 to-blue-500';
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">How challenging?</h3>
        <p className="text-sm text-gray-600">Sets mission difficulty and time boxes</p>
      </div>

      <div className="space-y-3">
        {difficulties.map((difficulty) => (
          <button
            key={difficulty.id}
            onClick={() => onSelectDifficulty(difficulty.id)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
              selectedDifficulty === difficulty.id
                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-full bg-gradient-to-br ${getColor(difficulty.id)} text-white mt-1`}
              >
                {getIcon(difficulty.id)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{difficulty.name}</p>
                <p className="text-sm text-gray-600">{difficulty.description}</p>
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  <span>⏱️ {difficulty.timePerMission / 60} min per mission</span>
                  <span>•</span>
                  <span>📍 {difficulty.missionCount} missions</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DifficultySelector;
