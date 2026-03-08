import React from 'react';
import { Zap, RotateCcw } from 'lucide-react';

const CompletionScreen = ({ onReset }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in zoom-in duration-500 bg-gradient-to-b from-white to-green-50/50">
    <div className="relative">
      <div className="absolute inset-0 bg-green-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
      <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl relative z-10">
        <Zap className="w-16 h-16 text-white fill-white" />
      </div>
    </div>

    <div className="space-y-4">
      <h2 className="text-4xl font-black text-gray-900 tracking-tight">Session Complete!</h2>
      <p className="text-gray-600 text-lg max-w-xs mx-auto leading-relaxed">
        Your brain did the thing. <br />
        Your space has room to breathe. <br />
        <span className="font-bold text-green-600">Dopamine secured.</span>
      </p>
    </div>

    <button
      onClick={onReset}
      className="flex items-center gap-3 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all hover:bg-black"
      aria-label="Start a new session"
    >
      <RotateCcw className="w-5 h-5" />
      Start New Session
    </button>
  </div>
);

export default CompletionScreen;
