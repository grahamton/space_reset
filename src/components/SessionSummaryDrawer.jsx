import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';

const SessionSummaryDrawer = ({ sessionState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { missionQueue, completedCount } = sessionState;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
          role="presentation"
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.1)] rounded-t-[2rem] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) z-30 will-change-transform
        ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'}`}
        style={{ height: '70vh', touchAction: 'none' }}
      >
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 flex items-center justify-between px-8 cursor-pointer border-b border-gray-100 hover:bg-gray-50 rounded-t-[2rem]"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsOpen(!isOpen);
            }
          }}
          aria-expanded={isOpen}
          aria-label={`Your missions: ${completedCount} of ${missionQueue.length} done`}
        >
          <span className="font-bold text-gray-700 flex items-center gap-2">Your missions</span>
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
              {completedCount} of {missionQueue.length} done
            </div>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden="true" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" aria-hidden="true" />
            )}
          </div>
        </div>

        <div
          className="p-6 overflow-y-auto h-[calc(70vh-3.5rem)] bg-gray-50 space-y-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {missionQueue.map((m, idx) => {
            const isDone = idx < completedCount;
            const isCurrent = idx === completedCount;
            return (
              <div
                key={m.id + idx}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-white border-indigo-500 shadow-md scale-[1.02]'
                    : isDone
                      ? 'bg-gray-100 border-gray-100 opacity-60'
                      : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`font-bold text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {m.title}
                  </h4>
                    {isDone && <span className="sr-only">Done: </span>}
                    {isCurrent && <span className="sr-only">Now: </span>}
                  {isDone && <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />}
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{m.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SessionSummaryDrawer;
