import React, { useState } from 'react';
import { Volume2, Bell } from 'lucide-react';
import { loadPreference, savePreference } from '../modules/storageModule';
import {
  playChime,
  primeAudioContext,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission
} from '../modules/timerAlerts';

/**
 * Self-contained "when the timer hits zero" settings: sound and browser
 * notification toggles. No required props - reads and writes its own
 * preferences via storageModule, same as the rest of the app's settings.
 */
const TimerAlertSettings = () => {
  const [soundOn, setSoundOn] = useState(() => loadPreference('TIMER_SOUND', 'true') === 'true');
  const [notifyOn, setNotifyOn] = useState(
    () => loadPreference('TIMER_NOTIFY', 'false') === 'true'
  );
  const [permission, setPermission] = useState(() => getNotificationPermission());

  const supported = isNotificationSupported();
  const denied = permission === 'denied';

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    savePreference('TIMER_SOUND', String(next));
    if (next) {
      primeAudioContext();
      playChime();
    }
  };

  const toggleNotify = async () => {
    if (notifyOn) {
      setNotifyOn(false);
      savePreference('TIMER_NOTIFY', 'false');
      return;
    }

    // Requesting permission needs a user gesture - this click is it.
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result !== 'granted') {
      savePreference('TIMER_NOTIFY', 'false');
      return;
    }

    setNotifyOn(true);
    savePreference('TIMER_NOTIFY', 'true');
  };

  const handleTestSound = () => {
    primeAudioContext();
    playChime();
  };

  const notifyHelperText = () => {
    if (!supported) return "Notifications aren't supported in this browser.";
    if (denied)
      return 'Blocked in your browser settings - allow notifications for this site to use it.';
    return 'Needs this tab open. It skips a fully closed tab.';
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Timer alerts</h3>
        <p className="text-sm text-gray-600">A gentle nudge when a mission's timer hits zero.</p>
      </div>

      <div className="space-y-3">
        <div className="w-full p-4 rounded-2xl border-2 border-gray-200 bg-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="p-3 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-white mt-1"
              aria-hidden="true"
            >
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Sound when time's up</p>
              <p className="text-sm text-gray-600">A short, calm chime. No files, no network.</p>
              <button
                onClick={handleTestSound}
                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 min-h-11 -ml-3 -mb-2 rounded-lg transition-colors"
              >
                Test sound
              </button>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={soundOn}
            aria-label="Sound when time's up"
            onClick={toggleSound}
            className={`shrink-0 w-12 h-7 rounded-full transition-colors relative before:absolute before:-inset-2 before:content-[''] ${soundOn ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundOn ? 'translate-x-6' : 'translate-x-1'}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="w-full p-4 rounded-2xl border-2 border-gray-200 bg-white flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="p-3 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-white mt-1"
              aria-hidden="true"
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Notify me when time's up</p>
              <p className="text-sm text-gray-600">{notifyHelperText()}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={notifyOn}
            aria-label="Notify me when time's up"
            onClick={toggleNotify}
            disabled={!supported || denied}
            className={`shrink-0 w-12 h-7 rounded-full transition-colors relative before:absolute before:-inset-2 before:content-[''] disabled:opacity-40 disabled:cursor-not-allowed ${notifyOn ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifyOn ? 'translate-x-6' : 'translate-x-1'}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerAlertSettings;
