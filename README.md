# Space Reset Coach

A mobile-first, ADHD-friendly "space reset" assistant that turns a messy room photo into small, guided missions.

## Getting started

```bash
npm install
npm run dev
```

This serves the app from `public/` at http://localhost:8080 with auto-reload.

## Scripts

- `npm run dev` – start a static dev server for `public/`.
- `npm run lint` – run ESLint against the ES module source in `src/`.
- `npm run format` – format HTML/CSS/JS across `public/` and `src/` with Prettier.

## Project structure

- `public/` – static assets and the SPA shell (`index.html`, CSS, sample SVG).
- `src/` – modular JavaScript for vision stubs, chunking, prioritization, missions, storage, and UI wiring.

## Notes

- The vision module is a stub that returns common room zones; swap `analyzeImage` for real CV without changing other modules.
- Sessions persist to `localStorage` (zones, tasks, order, progress, timer) so you can resume after a refresh. Use the "Clear saved session" button to wipe local data.
- Timers can be paused/resumed and will continue after reloads. Missions can be deferred with "Too much, later" for gentler re-entry.
