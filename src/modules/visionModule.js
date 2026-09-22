/**
 * visionModule - Sends a room photo to the mission worker.
 *
 * The worker holds the Anthropic key and owns the prompt, so this is just
 * transport. See worker/src/index.js.
 */

import {
  applyDifficultyToMissions,
  normalizeMissionCount,
  DEFAULT_DIFFICULTY,
  DEFAULT_MISSION_COUNT
} from '../../shared/roomTypes.js';
import { prepareImageForUpload } from './imageModule.js';

// Same-origin by default: the Vite proxy in dev, and in production the worker
// serves the app itself (worker/wrangler.toml [assets]). VITE_WORKER_URL is only
// for hosting the app somewhere other than the worker.
const MISSIONS_ENDPOINT = import.meta.env.VITE_WORKER_URL
  ? `${import.meta.env.VITE_WORKER_URL.replace(/\/$/, '')}/api/missions`
  : '/api/missions';

export const SIGNED_OUT_MESSAGE =
  'Your sign-in has expired. Reload the app to sign in again, then retake the photo.';

/** Offline missions, used only when the user explicitly opts in after a failure. */
export const DEFAULT_FALLBACK_DATA = {
  status: 'ok',
  // No persona voiced these, so there's nothing in-character to say.
  note: '',
  missions: [
    {
      id: 'm1',
      title: 'The Trash Harvest',
      description:
        "Grab a trash bag. Scan the room. Ignore laundry, ignore books. Just find the trash. Wrappers, receipts, empty bottles—if it's trash, it goes in the bag.",
      time: 120,
      type: 'trash',
      strategy: "Tunnel vision: If it's not trash, it doesn't exist right now."
    },
    {
      id: 'm2',
      title: 'Laundry Raid',
      description:
        'Grab a basket. Swoop up all clothes on the floor. Do not sort them. Just contain them.',
      time: 180,
      type: 'laundry',
      strategy: 'Containment is the goal, not perfection.'
    },
    {
      id: 'm3',
      title: 'Dish Dash',
      description: 'Gather all cups, plates, and bottles. Relocate them to the kitchen sink.',
      time: 60,
      type: 'dishes',
      strategy: "Don't wash them yet. Just get them out of this room."
    },
    {
      id: 'm4',
      title: 'Surface Sweep',
      description: 'Clear the most annoying flat surface (desk or nightstand).',
      time: 300,
      type: 'clear',
      strategy: 'Make one spot nice to look at.'
    }
  ]
};

/**
 * Fallback missions have hardcoded, difficulty-blind times, so they get the
 * multiplier. Live missions are paced by the prompt instead.
 *
 * There are only a handful of these canned missions, so a fixed count can only
 * be honored by trimming, never padded out with invented ones — same honesty
 * principle as the live prompt. 'auto' returns the full set.
 */
export const getFallbackMissions = (
  difficulty = DEFAULT_DIFFICULTY,
  missionCount = DEFAULT_MISSION_COUNT
) => {
  const sized = applyDifficultyToMissions(DEFAULT_FALLBACK_DATA.missions, difficulty);
  const count = normalizeMissionCount(missionCount);
  const missions = count === 'auto' ? sized : sized.slice(0, count);
  return { status: DEFAULT_FALLBACK_DATA.status, note: DEFAULT_FALLBACK_DATA.note, missions };
};

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = () => reject(new Error("Couldn't open that photo. Try a different one."));
    reader.readAsDataURL(file);
  });

export const visionModule = {
  /**
   * @throws {Error} with a message suitable for display. Callers decide whether
   *   to offer the offline fallback — this never substitutes it silently.
   */
  analyzeImage: async (
    file,
    {
      personaId,
      roomType,
      difficulty = DEFAULT_DIFFICULTY,
      missionCount = DEFAULT_MISSION_COUNT
    } = {}
  ) => {
    // Shrink camera photos to Claude's vision limit. Done here, behind the
    // analyzing screen, so the UI responds the moment a photo is taken.
    const upload = await prepareImageForUpload(file);
    const image = await fileToBase64(upload);

    let response;
    try {
      response = await fetch(MISSIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Behind Cloudflare Access, an expired login redirects to the sign-in
        // page on another origin. Followed, that surfaces as a bare network
        // error; kept manual, it's recognisable below.
        redirect: 'manual',
        body: JSON.stringify({
          image,
          mimeType: upload.type,
          personaId,
          roomType,
          difficulty,
          missionCount
        })
      });
    } catch {
      throw new Error("Can't connect right now. Check your internet, then try again.");
    }

    if (response.type === 'opaqueredirect' || response.status === 401 || response.status === 403) {
      throw new Error(SIGNED_OUT_MESSAGE);
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Something went wrong reading your photo. Try again.');
    }
    // A 'retake' or 'tidy' response can legitimately carry zero missions — only
    // an 'ok' with nothing in it means something went wrong.
    if (payload.status === 'ok' && !payload.missions?.length) {
      throw new Error("Couldn't find any missions in that photo. Try a wider shot of the room.");
    }

    return payload;
  }
};
