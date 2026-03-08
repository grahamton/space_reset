import React from 'react';
import { Zap, Settings, LogOut } from 'lucide-react';

const Header = ({ onOpenSettings, sessionStatus, onReset }) => (
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
