# Space Reset

A mobile-first, ADHD-friendly cleaning coach. Photograph a messy room and Claude turns it into a handful of small, timed missions — sized to the mess in the photo, or a fixed count you pick — in whichever voice actually works on your brain today.

Don't clean everything. Just start somewhere.

## How it works

1. Pick a persona (the "Vibe Check" dropdown) and, optionally, a room type, energy level and mission count in Settings.
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

The worker serves the built app and the API from one origin (`[assets]` in `worker/wrangler.toml`), so there's one thing to deploy and no CORS or `VITE_WORKER_URL` to set.

```bash
npx wrangler login     # once, from worker/ (opens a browser)
npm run deploy         # from the repo root: builds dist/ and deploys the worker
```

It lands at `https://space-reset-worker.<your-subdomain>.workers.dev`.

**Lock it down before adding the API key.** Every photo is billed to your Anthropic key, so put Cloudflare Access in front first:

1. Cloudflare dashboard → Workers & Pages → `space-reset-worker` → Settings → Domains & Routes → on the `workers.dev` row, enable **Cloudflare Access**. That creates an Access application for the URL.
2. In Zero Trust → Access → Applications, edit that application: allow your email address(es), and set a long session duration (e.g. 1 month) so the installed app rarely asks you to sign in.
3. Open the URL in a private window and check you get the Cloudflare sign-in page, not the app.

Then add the key from `worker/`, and paste it at the prompt:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

**Install on Android:** open the URL in Chrome, sign in, then menu → **Add to Home screen** (or **Install app**). It opens full-screen with its own icon. Updates go live on the next `npm run deploy`; reopen the app to pick them up. If your sign-in expires, the app says so; reload it to sign in again.

## Configuration

The model and reasoning effort live at the top of `worker/src/index.js`. It runs `claude-opus-5` at `medium` effort — analysis sits behind a spinner, so latency is a feature. Raise the effort if mission quality disappoints.

To add a persona, add an entry to `shared/personas.js`. Nothing else needs to change.

## Notes

- **Difficulty and mission count are separate settings.** Difficulty shapes how big and ambitious each mission is (time-box size); mission count controls how many you get, either 'auto' (Claude sizes it to the mess, roughly 3–6) or a fixed number. The `applyDifficultyToMissions` multiplier is only used on the offline fallback missions, whose times are hardcoded.
- **Skipping defers.** A skipped mission goes to the back of the queue. Skip every remaining mission and the session ends rather than cycling forever.
- **Failures are visible.** If analysis fails you get the reason and the option to use the built-in missions instead — never a silent substitution.
