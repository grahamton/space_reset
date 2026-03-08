# Feature Plan: Personalization & Vibes

## 1. Emotional Levers (The "Vibe" Toggle)

Goal: Allow the user to choose the "personality" of the cleaning coach.

### Proposed Vibes

* **Gentle / ADHD-Friendly** (Current Default): "Let's just do 5 things. You got this."
* **Drill Sergeant**: "DROP AND GIVE ME 5 TRASH ITEMS! NO EXCUSES!"
* **Roast Master (Shame)**: "Living like a raccoon, are we? Let's fix this before someone sees."
* **Bestie / Hype**: "YAAAS QUEEN! Slay that laundry pile! You're doing amazing sweetie."
* **Existential Dread**: "Entropy is inevitable, but we can delay it for 10 minutes."

## 2. Persona Prompt Tuning (Developer/Power User)

Goal: Centralize prompt definitions to allow easy tuning of the ADHD persona and others.

### Implementation

* **Architecture**: Extract all prompt logic into a dedicated `src/config/personas.js` file.
* **Structure**: Export a dictionary of personas where each key contains the specific `systemInstruction` and `temperature` settings.
* **Benefit**: Allows rapid iteration on the "ADHD" or "Roast" personas by editing one file, without cluttering the UI.

## 3. Technical Flow

1. **Load Settings**: Retrieve `apiKey` and `selectedVibe` from storage on app load.
2. **Construct Prompt**:
    * Combine `BASE_STRUCTURE_PROMPT` + `VIBE_INSTRUCTIONS[selectedVibe]`.
3. **Call Gemini**: Send the tailored prompt with the image.

## 4. Future Polish

* **Voice/TTS**: Use the Web Speech API to read the missions out loud in a voice matching the vibe (e.g., fast/energetic for Hype, slow/monotone for Dread).
