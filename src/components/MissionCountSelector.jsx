import React from 'react';
import { MISSION_COUNT_CHOICES } from '../../shared/roomTypes.js';

const chipLabel = (value) => (value === 'auto' ? 'Auto' : String(value));

// selectedMissionCount round-trips through localStorage as a string ('auto' or
// e.g. '3'), while the chip values themselves are numbers (auto excepted), so
// compare as strings rather than requiring the caller to keep them in sync.
const isSelected = (selected, value) => String(selected) === String(value);

/**
 * How many missions to ask for, separate from difficulty (which sizes each
 * one). A row of chips rather than a menu — quick to scan and tap.
 */
const MissionCountSelector = ({ selectedMissionCount, onSelectMissionCount }) => (
  <div className="w-full space-y-4">
    <div className="text-center">
      <h3 className="text-lg font-bold text-gray-900 mb-2">How many missions?</h3>
      <p className="text-sm text-gray-600">
        Auto lets Claude size it to the mess in your photo, usually 3 to 6.
      </p>
    </div>

    <div className="flex flex-wrap justify-center gap-2">
      {MISSION_COUNT_CHOICES.map((value) => (
        <button
          key={value}
          onClick={() => onSelectMissionCount(value)}
          aria-pressed={isSelected(selectedMissionCount, value)}
          className={`min-w-[3rem] min-h-11 px-3 rounded-full border-2 font-bold text-sm transition-all ${
            isSelected(selectedMissionCount, value)
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          {chipLabel(value)}
        </button>
      ))}
    </div>
  </div>
);

export default MissionCountSelector;
