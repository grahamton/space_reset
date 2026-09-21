# Space Reset

A mobile-first, ADHD-friendly cleaning coach. Photograph a messy room and Claude turns it into four to six small, timed missions — in whichever voice actually works on your brain today.

Don't clean everything. Just do 5 Things.

## How it works

1. Pick a persona (the "Vibe Check" dropdown) and, optionally, a room type and difficulty in Settings.
2. Snap a photo of the room.
3. The photo goes to a Cloudflare Worker, which asks Claude for missions and returns them as structured JSON.
4. Missions arrive as a card stack — one at a time, each with a time box you can start, pause or extend.
5. Complete or defer each one. Finish the stack and the session lands in your history and streak.

Everything is stored in `localStorage`. There are no accounts, and sessions survive a refresh for 24 hours — including a running timer, which keeps counting while the tab is closed.

### Personas

The persona becomes Claude's system prompt, so the mission titles, descriptions and strategy tips are all written in character.

| Persona | Voice |
|---|---|
| Gentle / ADHD-Friendly *(default)* | "Progress, not perfection." |
| Drill Sergeant | "DROP AND GIVE ME 5 TRASH ITEMS." |
| Roast Master | "I can smell this picture." |
| Bestie / Hype | "YAAAS QUEEN, slay that laundry." |
| Existential Dread | "Entropy is inevitable, but clean this anyway." |

## Architecture

```
index.html           SPA shell
src/                 React app (Vite + Tailwind)
  App.jsx            useMissionControl — the session state machine
  components/        UI, one component per screen or panel
  modules/           visionModule (transport), storageModule, historyModule
shared/              Imported by BOTH the app and the worker
  personas.js        Persona definitions / system prompts
  roomTypes.js       Room types, difficulty levels
  prompt.js          Mission prompt assembly
worker/              Cloudflare Worker — holds the API key, calls Claude
```

The worker exists so the app never holds an API key. It's the only thing that talks to Anthropic; the client just POSTs a base64 photo to `/api/missions` and gets missions back. Response shape is enforced by a zod schema via structured outputs, so there's no JSON parsing to go wrong.

The session state machine has four states: `idle → analyzing → active → complete`.

## Getting started

Two processes: the worker and the app.

```bash
# 1. Worker
cd worker
npm install
cp .dev.vars.example .dev.vars   # then add your Anthropic API key
npm run dev                      # serves on http://localhost:8787

# 2. App (in another terminal, from the repo root)
npm install
npm run dev                      # http://localhost:5173
```

The Vite dev server proxies `/api` to the worker, so no extra configuration is needed locally.

You'll need an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/). A session costs well under a cent.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint over `src/`, `shared/` and `worker/` |
| `npm run format` | Prettier |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Coverage report |

Inside `worker/`: `npm run dev` (local), `npm run deploy`, `npm run tail` (live logs).

## Deploying

**Worker:**

```bash
cd worker
npx wrangler secret put ANTHROPIC_API_KEY
npm run deploy
```

Then set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to your Pages URL so CORS isn't wide open.

**App** — Cloudflare Pages, build command `npm run build`, output directory `dist`. Set `VITE_WORKER_URL` to the deployed worker origin (see `.env.example`).

## Configuration

The model and reasoning effort live at the top of `worker/src/index.js`. It runs `claude-opus-5` at `medium` effort — analysis sits behind a spinner, so latency is a feature. Raise the effort if mission quality disappoints.

To add a persona, add an entry to `shared/personas.js`. Nothing else needs to change.

## Notes

- **Difficulty is applied once.** It shapes the prompt (mission count and time-box size). The `applyDifficultyToMissions` multiplier is only used on the offline fallback missions, whose times are hardcoded.
- **Skipping defers.** A skipped mission goes to the back of the queue. Skip every remaining mission and the session ends rather than cycling forever.
- **Failures are visible.** If analysis fails you get the reason and the option to use the built-in missions instead — never a silent substitution.
