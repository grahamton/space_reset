# AGENTS.md - Coding Guidelines for Space Reset Coach

This file documents the codebase structure, build/test commands, and code style guidelines for agentic coding systems operating on this repository.

## Project Overview

**Space Reset Coach** is an ADHD-friendly mobile-first web app that turns room photos into small, guided cleaning missions using AI vision analysis. Built with React, Vite, and Tailwind CSS.

## Build & Development Commands

### Local Development
```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run lint         # Run ESLint (checks src/)
npm run format       # Format code with Prettier (src/ and public/)
```

### Running & Testing
- There are **no unit tests** currently. No jest/vitest setup.
- Manual testing is the current approach.
- Linting with `npm run lint` is the primary code quality check.

## File Structure

```
src/
  ├── App.jsx              # Main React component (666 lines)
  ├── main.jsx             # React DOM entry point
  ├── index.css            # Tailwind imports & global styles
  └── config/
      └── personas.js      # Persona definitions & system instructions

public/               # Static assets (HTML, CSS, images)
index.html           # SPA shell
vite.config.js       # Vite configuration (React plugin enabled)
.prettierrc           # Prettier config
eslint.config.js     # ESLint config (flat config format)
```

## Code Style Guidelines

### Imports & Module Organization
- **ES Modules** (type: "module" in package.json)
- React imports at top: `import React, { useState, useEffect, ... } from 'react'`
- Component/utility imports organized logically
- Icon imports from `lucide-react` (used throughout for UI icons)
- Config imports: `import { PERSONAS, DEFAULT_PERSONA } from './config/personas'`

### Formatting Standards
- **Single quotes** for strings (Prettier configured)
- **Print width:** 100 characters (Prettier)
- **Semicolons:** Required (Prettier)
- **Indentation:** 2 spaces (Prettier default)
- Run `npm run format` to auto-fix formatting

### Naming Conventions
- **Components:** PascalCase (e.g., `Header`, `SettingsModal`, `CurrentMission`)
- **Variables/functions:** camelCase (e.g., `startAnalysis`, `sessionState`, `apiKey`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_PERSONA`, `API_URL`)
- **CSS classes:** kebab-case via Tailwind (no custom CSS needed typically)

### React & State Management
- Functional components with hooks (React 18+)
- Use `useState` for local state, `useEffect` for side effects
- Custom hooks prefixed with `use` (e.g., `useMissionControl`)
- Props passed explicitly; no prop drilling workarounds unless critical
- JSX spread operator used sparingly, only for necessary props

### Error Handling
- Try-catch blocks around API calls (e.g., `visionModule.analyzeImage`)
- User-facing errors logged to console with `console.error` and shown via `alert` or error state
- Graceful fallbacks (e.g., `DEFAULT_FALLBACK_DATA` when API fails)
- Example pattern:
  ```javascript
  try {
    const result = await visionModule.analyzeImage(file, apiKey, persona);
  } catch (error) {
    console.error("Vision Analysis Failed:", error);
    setError(error.message);
  }
  ```

### Component Structure (Key Pattern in App.jsx)
1. **Utilities section** - Helper functions (e.g., `fileToGenerativePart`)
2. **Constants section** - Default data (e.g., `DEFAULT_FALLBACK_DATA`)
3. **Module section** - Logic encapsulation (e.g., `visionModule`, `useMissionControl`)
4. **UI Components** - React components (e.g., `Header`, `CurrentMission`)
5. **Main App** - Default export with orchestration

### localStorage Usage
- Keys: `'gemini_api_key'`, `'selected_persona_id'`
- Retrieve on component mount via `useState` initializer
- Persist with `localStorage.setItem()` in save handlers
- No localStorage cleanup hooks needed (user manually clears via UI button)

### Styling Conventions
- **Tailwind CSS** (v3.4) for all styling—no CSS-in-JS or custom CSS files
- Responsive design: mobile-first, use `sm:`, `md:`, etc. when needed
- Common patterns:
  - Spacing: `px-4 py-3`, `gap-2`, `space-y-4`
  - Colors: `bg-indigo-600`, `text-gray-900`, `border-gray-100`
  - Interactive states: `hover:`, `active:`, `focus:`
  - Animations: `animate-spin`, `animate-pulse`, `transition-all`
- Animation durations: `duration-300`, `duration-500`

### API Integration
- **Gemini API** (generativelanguage.googleapis.com) for image analysis
- Model version: `gemini-2.5-flash-preview-09-2025`
- Request format: multipart (image + text prompt)
- Response format: JSON (responseMimeType: "application/json")
- User provides API key via settings modal; stored in localStorage

## ESLint Configuration

**File:** `eslint.config.js` (Flat Config format)
- **Target:** ES2021, module source type
- **Browser globals:** Enabled
- **Rules:**
  - `no-unused-vars`: Warn (ignores args starting with `_`)
  - `no-console`: Off (logging is allowed)
  - Report unused disable directives
- **Scope:** `src/**/*.js` and `src/**/*.jsx`

## Prettier Configuration

**File:** `.prettierrc`
- Single quotes: `true`
- Print width: `100`
- Semicolons: `true`

## Key Development Notes

1. **No test framework** – lint with `npm run lint` for quality checks
2. **Image upload handling** – FileReader API converts to base64 for API submission
3. **Mission queue** – Managed via `useMissionControl` hook; skipped items are re-queued
4. **Personas** – Swap instructions in `src/config/personas.js` without changing other logic
5. **Fallback flow** – Missing API key or network error triggers `DEFAULT_FALLBACK_DATA`
6. **localStorage persistence** – Sessions and settings auto-recover on page reload

## Common Tasks for Agents

- **Add feature:** Maintain component structure (utilities → modules → UI → App)
- **Fix bug:** Check error logs in console; verify async API calls
- **Style update:** Use Tailwind only; run `npm run format` after changes
- **New persona:** Add to `PERSONAS` object in `src/config/personas.js`
- **Component refactor:** Extract UI to separate const function and wire in App

## Quick Checklist

- [ ] Run `npm run lint` and fix issues
- [ ] Run `npm run format` before commit
- [ ] Test in dev mode: `npm run dev`
- [ ] Verify localStorage keys match existing ones
- [ ] Check error handling follows try-catch pattern
- [ ] Use Tailwind only (no custom CSS)
