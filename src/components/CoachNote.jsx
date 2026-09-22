import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

/**
 * A short persona speech-bubble shown above the current mission card.
 *
 * Compact and dismissible on purpose: it sits above `CurrentMission` on a
 * phone screen and must never push the mission's buttons out of view.
 */
const CoachNote = ({ note }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!note || dismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 mx-4 mt-3 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-sm rounded-xl shrink-0"
    >
      <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 leading-snug">{note}</p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-indigo-400 hover:text-indigo-600"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default CoachNote;
