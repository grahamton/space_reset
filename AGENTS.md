# AGENTS.md — Coding guidelines for Space Reset

Conventions for agentic coding systems working in this repository.

## Project overview

**Space Reset** is an ADHD-friendly, mobile-first web app that turns a room photo into small, timed cleaning missions. React + Vite + Tailwind on the front, a Cloudflare Worker calling the Claude API on the back.

The worker exists so the browser never holds an API key. Any change that moves the Anthropic call back into client code is wrong.

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run lint         # ESLint over src/, shared/, worker/
npm run format       # Prettier
npm test             # Vitest, single run
npm run test:coverage
npm run copy-check   # eval-photos/ x personas through the worker, then TypeSafe rule checks

cd worker && npm run dev      # wrangler dev on :8787
cd worker && npm run deploy
```

The app needs the worker running to analyze a photo. Vite proxies `/api` to `:8787`.

## Layout

```
index.html                SPA shell (inline SVG favicon, no icon files)
src/
  App.jsx                 useMissionControl hook + root component
  ErrorFallback.jsx       Error boundary (class component)
  main.jsx                Entry point
  components/             One per screen or panel
  modules/
    visionModule.js       Transport to the worker. No prompt logic.
    storageModule.js      localStorage: session, timer, preferences
    historyModule.js      History, streaks, stats, achievements
shared/                   Imported by BOTH src/ and worker/
  personas.js             Persona definitions (become system prompts)
  roomTypes.js            Room types, difficulty levels, pure helpers
  prompt.js               Mission prompt assembly
  copyChecks.js           TypeSafe questions that test mission copy against the prompt's rules
worker/src/index.js       POST /api/missions
scripts/copy-check.js     Eval runner for copyChecks (Node only; see below)
```

**`shared/` must stay browser- and worker-safe**: pure data and pure functions only. No DOM, no `localStorage`, no Node built-ins. Both bundlers pull from it.

## Where things belong

- **Prompt wording** → `shared/prompt.js`. Not in the worker, not in the client.
- **Persona voice** → `shared/personas.js`. The `systemInstruction` is passed as Claude's `system` parameter.
- **Response shape** → the zod schema in `worker/src/index.js`. Structured outputs enforce it; don't add defensive JSON parsing downstream.
- **Anything touching `localStorage`** → `storageModule.js` or `historyModule.js`. Components shouldn't call `localStorage` directly.

## Code style

- ES modules, plain JavaScript. No TypeScript anywhere, including the worker.
- Prettier: single quotes, 100 columns, semicolons, 2-space indent.
- Components PascalCase, functions camelCase, constants UPPER_SNAKE_CASE.
- Functional components and hooks; `ErrorFallback` is the one class component (error boundaries require it).
- Tailwind only. No CSS-in-JS, no new stylesheets. `src/index.css` holds the directives and two global rules.
- Icons come from `lucide-react`.
- Use `import.meta.env`, never `process.env` — this is browser code.

## The Claude call

Lives only in `worker/src/index.js`.

- Model and effort are constants at the top of the file. Default `claude-opus-5` at `medium` effort.
- Persona → `system`. Photo → a base64 `image` content block. Instructions → a `text` block after it.
- Structured output via `zodOutputFormat(MissionsSchema)` on `client.messages.parse()`; read `response.parsed_output`.
- Check `stop_reason === 'refusal'` and a null `parsed_output` before using the result.
- Mission `id`s are assigned by the worker after parsing, not requested from the model.
- Errors map through `Anthropic.APIError` subclasses to distinct client messages. Never forward a raw SDK error to the client.

When touching the API surface, verify against the installed SDK rather than memory — this code was already migrated once from a version whose helper paths differed.

## Session state machine

`useMissionControl` in `src/App.jsx` owns it. States: `idle → analyzing → active → complete`.

Invariants worth preserving:

- `currentMissionIndex === completedCount` always. Completing advances both; skipping advances neither. `SessionSummaryDrawer` relies on this to mark done/current.
- Skipping rotates the mission to the back of the queue and increments `consecutiveSkips`. When that reaches the number of remaining missions, the session completes — otherwise the last mission could be deferred forever.
- Any progress resets `consecutiveSkips`.
- `recordCompletion` fires exactly once, at the transition into `complete`.

## Testing

Vitest + jsdom + Testing Library. `vitest.setup.js` imports `@testing-library/jest-dom` and mocks `localStorage` and `matchMedia`.

Covered: `useMissionControl` (state machine, skip guard, history recording), the worker contract (routing, validation, prompt assembly, failure mapping), `storageModule`, `historyModule`, `Header`, `SettingsModal`.

Worker tests mock `@anthropic-ai/sdk` via `vi.hoisted`; the real zod helper runs against the real schema.

Run `npm test` before committing. It should be fully green — if it isn't, that's a regression, not a known failure.

## Common tasks

- **New persona** → add to `PERSONAS` in `shared/personas.js`. Nothing else.
- **Change mission wording or rules** → `buildMissionPrompt` in `shared/prompt.js`.
- **New mission type** → add to `MISSION_TYPES` in `shared/roomTypes.js` (the zod enum reads from it) and give it a colour in `getColor` in `CurrentMission.jsx`.
- **New room type or difficulty** → `shared/roomTypes.js`. The selectors render from it automatically.

## Checklist

- [ ] `npm run lint` — zero errors
- [ ] `npm test` — all green
- [ ] `npm run build` — succeeds
- [ ] No API key or secret in client code, and none committed
- [ ] `shared/` still free of DOM and Node APIs

## Claude Code subagents

Project subagents live in `.claude/agents/`:

- `prompt-engineer`: persona voices, the mission prompt, schema descriptions and worker error text (`shared/`, `worker/`). It checks its changes with real calls against the local worker.
- `ux-copywriter`: user-facing text in the React app (`src/`, `index.html`). It changes copy only, never behavior.

Their file ownership doesn't overlap, so they can run in parallel. Test photos go in `eval-photos/` at the repo root, which is gitignored. Never commit them.

## Checking mission copy

`npm run copy-check` sends every photo in `eval-photos/` through the worker (in-process, no `wrangler dev`) for each persona, then asks TypeSafe whether each card and note breaks a rule from `prompt.js` or `personas.js`: mentions a person, leftover draft text, shaming, pet names, pep-talk strategies, a note that restates a mission, or a `type` that doesn't match the card. It needs `ANTHROPIC_API_KEY` and `TYPESAFE_API_KEY` in `worker/.dev.vars`.

- Options: `--personas a,b`, `--difficulty`, `--room`, `--count`, `-v` to include review-level findings.
- Each run saves to `eval-results/` (gitignored). Pass a saved file to re-check it without calling Claude again, e.g. after editing a question in `copyChecks.js`.
- `npm run copy-check -- scripts/copy-check-canaries.json` checks the checks: hand-written bad cards that must flag, and a clean one that must not. Run it after changing any question, and add a canary when you add a rule.
- When you change a rule in the prompt or a persona, update the matching question in `copyChecks.js` too. The check has to test the same rule the prompt sets, or it will flag copy that follows it.
