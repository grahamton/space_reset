import React from 'react';
import { Zap, Settings, LogOut, Flame } from 'lucide-react';

const Header = ({ onOpenSettings, onOpenStats, sessionStatus, onReset, streak = 0 }) => (
  <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
        <Zap className="w-5 h-5 fill-white text-white" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-gray-900">Space Reset</h1>
    </div>
    <div className="flex items-center gap-2">
      {sessionStatus === 'active' && (
        <button
          onClick={() => {
            if (confirm('Quit this session?')) onReset();
          }}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          title="Restart Session"
          aria-label="Quit current session"
        >
          <LogOut className="w-6 h-6" />
        </button>
      )}
      <button
        onClick={onOpenStats}
        className="p-2 text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-1"
        aria-label={streak > 0 ? `View progress, ${streak} day streak` : 'View progress'}
      >
        <Flame className={`w-6 h-6 ${streak > 0 ? 'text-orange-500' : ''}`} />
        {streak > 0 && <span className="text-sm font-bold text-orange-600">{streak}</span>}
      </button>
      <button
        onClick={onOpenSettings}
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Open settings"
      >
        <Settings className="w-6 h-6" />
      </button>
    </div>
  </header>
);

export default Header;
