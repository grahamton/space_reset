import React from 'react';
import { getAllRoomTypes } from '../../shared/roomTypes.js';

const RoomTypeSelector = ({ selectedRoomType, onSelectRoom }) => {
  const roomTypes = getAllRoomTypes();

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Where are we cleaning?</h3>
        <p className="text-sm text-gray-600">Helps tailor the missions</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {roomTypes.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={`p-4 rounded-2xl border-2 transition-all text-center ${
              selectedRoomType === room.id
                ? 'border-indigo-600 bg-indigo-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{room.icon}</div>
            <p className="font-bold text-sm text-gray-900">{room.name}</p>
            <p className="text-xs text-gray-600 mt-1">{room.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoomTypeSelector;
