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
  copyChecks.js      Jev (TypeSafe) questions that test mission copy against the prompt's rules
worker/              Cloudflare Worker — holds the API key, calls Claude
scripts/
  copy-check.js      Eval runner: photos × personas through the worker, then Jev
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

You'll need an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/). On Sonnet 5 one photo analysis should cost roughly 1–3¢ (estimated from token prices, not yet measured), so $20 of credit covers somewhere around 700–2,000 analyses.

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
| `npm run copy-check` | Generate missions for `eval-photos/` and check the copy with Jev (see below) |

Inside `worker/`: `npm run dev` (local), `npm run deploy`, `npm run tail` (live logs).

## Deploying

The worker serves the built app and the API from one origin (`[assets]` in `worker/wrangler.toml`), so there's one thing to deploy and no CORS or `VITE_WORKER_URL` to set.

```bash
npx wrangler login     # once, from worker/ (opens a browser)
npm run deploy         # from the repo root: builds dist/ and deploys the worker
```

It lands at `https://space-reset-worker.<your-subdomain>.workers.dev`.

Then add the key from `worker/`, and paste it at the prompt:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

### Public vs private

Every photo is billed to your Anthropic key. The deployed app is **public**, with these guards:

| Guard | Where | What it does | Limits |
|---|---|---|---|
| **Spend cap** | Anthropic Console | Turn off auto-reload, or give the app its own workspace with a spend limit. | The only hard cap. Set it before anything else. |
| **Edge rate limit** | `[[ratelimits]]` in `worker/wrangler.toml` | Fast first pass at 3 requests per IP per minute. | Cloudflare counts approximately and per data centre; this is not the exact guard. |
| **Exact per-IP limit** | `MISSION_QUOTA` Durable Object | Admits at most 3 requests per IP in a rolling 60 seconds before Claude is called; returns 429. | Identifies a client by `CF-Connecting-IP`; callers behind one public IP share the allowance. |
| **Daily global cap** | `MISSION_QUOTA` Durable Object and `DAILY_MISSION_CAP` | Admits at most 50 requests per UTC day across all clients; returns 429 after that. | Counts admitted attempts, including model failures. Change the configured value after reviewing usage and spend. |
| **Origin check** | `ALLOWED_ORIGIN` in `worker/wrangler.toml` | Other websites' pages can't call the API (403). The app's own origin, Rainbowfetch's two canonical origins, and localhost are allowed. | Scripts can fake the Origin header; it is not authentication. |

To make it **private** instead, put Cloudflare Access in front before adding the key:

1. Cloudflare dashboard → Workers & Pages → `space-reset-worker` → Settings → Domains & Routes → on the `workers.dev` row, enable **Cloudflare Access**.
2. In Zero Trust → Access → Applications, edit that application: allow your email address(es), and set a long session duration (e.g. 1 month).
3. Open the URL in a private window and check you get the Cloudflare sign-in page, not the app.

**Install on Android:** open the URL in Chrome, then menu → **Add to Home screen** (or **Install app**). It opens full-screen with its own icon. Updates go live on the next `npm run deploy`; reopen the app to pick them up.

## Configuration

The model and reasoning effort live at the top of `worker/src/missionHandler.js`. It runs `claude-sonnet-5` at `medium` effort — analysis sits behind a spinner, so latency is a feature. Raise the effort if mission quality disappoints.

**Why Sonnet 5, not Opus.** The app sends one photo and gets back about six short structured cards. Sonnet 5 costs $2 / $10 per million input/output tokens against Opus 5's $5 / $25, **60% less per analysis**, with the same request shape (vision, structured output, effort). Jev showed the copy held up on the switch (see below). Haiku 4.5 would be cheaper again ($1 / $5), but it rejects the `effort` parameter and hasn't been evaluated.

To add a persona, add an entry to `shared/personas.js`. Nothing else needs to change.

## Checking mission copy with Jev

The prompt and personas set rules for the copy: never mention a person in the photo, no pet names, no shaming, strategies must be tactics rather than pep talk, the note mustn't repeat a mission, and so on. `npm run copy-check` tests those rules on real output. It sends every photo in `eval-photos/` (gitignored, bring your own) through the worker once per persona, then asks **Jev**, TypeSafe's System One model (`jev-1.13.0` at the time of writing), one yes/no question per rule per card and note. Each mission set is one TypeSafe call of about 40 questions. It needs `ANTHROPIC_API_KEY` and `TYPESAFE_API_KEY` in `worker/.dev.vars`.

```bash
npm run copy-check                                     # generate + check (calls Claude and Jev)
npm run copy-check -- eval-results/<file>.json -v      # re-check a saved run: Jev only, no Claude calls
npm run copy-check -- scripts/copy-check-canaries.json # check the checks
```

The canaries are hand-written cards with known problems that must flag, plus clean ones that must not. Run them after changing any rule, and add one when you add a rule.

### What we've seen so far (September 2026, 3 photos × 5 personas)

**It made the model switch a measured decision.** Jev scored Opus 5 and Sonnet 5 against the same rules on the same photos:

| Run | Copy-rule flags | Wrong-type flags |
|---|---|---|
| Opus 5 | 0 | 0 |
| Sonnet 5 | 0 | 4 of 79 cards |
| Sonnet 5 + one prompt line | 0 | 1 of 78 cards |

Sonnet broke no copy rules. Its one weakness was picking a card's type by where the job is, not what moves ("clothes on the floor → hamper" labelled `clear` instead of `laundry`). One line in the prompt (`MISSION_TYPE_RULE` in `shared/prompt.js`) fixed most of it, and the switch cut the per-analysis price by 60%.

**It caught a real rule break.** A gentle-voice note repeated a card's tactic ("one armful at a time, no sorting"). The note rule now covers strategies as well as instructions, and a fresh Opus run went from 1 flag and 7 reviews to 0 flags and 3 reviews.

**The canaries have held.** Every seeded problem flagged on every run, with no false positives on the clean ones.

**Limits worth knowing:**

- **Treat `flag` as signal and `review` as mostly noise.** Borderline reviews included "Sisyphus Had Sweatpants" read as mentioning a person, and "Floor first, decisions later" read as draft text. The review threshold (0.35 in `COPY_CHECK_THRESHOLDS`) is still the untuned default; raise it using saved runs.
- **The sample is small.** 3 photos is enough to catch a big regression, not to rank close options. Add photos to `eval-photos/` before trusting small differences.
- **Jev only sees text.** It can't tell whether a card names things that aren't in the photo, or whether a time box is sensible. Nothing checks photo grounding yet.
- **Checks must use the prompt's own wording.** A rule the prompt sets but the check doesn't know about makes Jev flag correct copy. That happened once with the type rule: a code reviewer spotted it, not Jev. Where possible, export the rule from `shared/prompt.js` and reuse it in `shared/copyChecks.js`, as `MISSION_TYPE_RULE` does.

**Cost:** one working session of prompt and model changes ran about 115 Jev calls (roughly 500k input tokens) plus 45 Claude generations. Re-checking a saved run costs only Jev calls, so iterate on checks that way.

## Notes

- **Difficulty and mission count are separate settings.** Difficulty shapes how big and ambitious each mission is (time-box size); mission count controls how many you get, either 'auto' (Claude sizes it to the mess, roughly 3–6) or a fixed number. The `applyDifficultyToMissions` multiplier is only used on the offline fallback missions, whose times are hardcoded.
- **Skipping defers.** A skipped mission goes to the back of the queue. Skip every remaining mission and the session ends rather than cycling forever.
- **Failures are visible.** If analysis fails you get the reason and the option to use the built-in missions instead — never a silent substitution.
