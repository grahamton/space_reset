import React from 'react';
import { Sparkles } from 'lucide-react';

const AnalyzingState = () => (
  <div
    className="flex flex-col items-center justify-center h-full space-y-8 p-8 text-center animate-in fade-in duration-700"
    role="status"
    aria-live="polite"
  >
    <div className="relative w-32 h-32" aria-hidden="true">
      <div className="absolute inset-0 border-8 border-gray-100 rounded-full"></div>
      <div className="absolute inset-0 border-8 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
      </div>
    </div>
    <div className="space-y-2">
      <h2 className="text-2xl font-bold text-gray-800">Reading your room…</h2>
      <p className="text-gray-500 font-medium">Picking a few small missions. Hang tight.</p>
    </div>
  </div>
);

export default AnalyzingState;
