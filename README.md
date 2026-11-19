# METAWIN RUSH

**Run. Collect. Compete. Win.**

A futuristic 2.5D endless runner for the browser, built mobile-first. Swipe through eight cities as the masked Metawin runner, collect META Coins, complete missions, climb the leaderboards and compete in the Metawin Arena.

- **Next.js 15 + React 19 + TypeScript + Tailwind** for the platform UI
- **Phaser 3** for the game (custom pseudo-3D renderer: perspective road, curves, 3D vehicle boxes, world-space particles)
- **Supabase (PostgreSQL + Auth)** for accounts, progression, leaderboards and tournaments, with Row Level Security and server-side validation
- **Web Audio** procedural soundtrack: a separate track for each city plus all sound effects. There are no audio files.
- Deployable to **Vercel** as-is

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables set, the game runs in **offline mode**: progress is saved in the browser, and the same rules engine the server uses runs locally. Everything is playable offline. The leaderboard and Arena then show only your own runs on that device; they never show invented players.

To enable accounts, global leaderboards and the Arena, see [Online mode (Supabase)](#online-mode-supabase).

## Controls

| Action | Mobile | Desktop |
| --- | --- | --- |
| Move left / right | Swipe left / right | ← → or A / D |
| Jump | Swipe up | ↑, W or Space |
| Slide | Swipe down | ↓ or S |
| Pause | Pause button | Esc or P |

There are no on-screen direction buttons. Swipes are detected on pointer-move (no need to lift your finger), several swipes can be chained in one touch, and page scrolling is blocked during play (`touch-action: none`). First-time players get an interactive tutorial: the game freezes at each obstacle until the right swipe is made. It can be replayed from **Profile → Settings**.

## What's in the game

**Core gameplay.** Three lanes with automatic forward running and an exponential speed ramp per city. Jumping and sliding have their own animations; sliding while airborne fast-falls into a slide. Collisions are swept along the distance covered each frame, so nothing is skipped at high speed. Steering into the side of an obstacle makes you stumble back into your lane, and a second stumble within 5 seconds ends the run.

**Obstacles.** Low barriers to jump, overhead gantries to slide under, stopped vehicles, construction equipment, trains and convoys, and oncoming traffic. They come from a seeded generator that guarantees fairness:
- every row leaves a passable lane;
- rows are spaced by reaction time at the current speed;
- an oncoming vehicle's lane stays clear along its whole path.

Unit tests check these rules across all cities and many seeds.

**Coins and power-ups.** Coins come in city-specific designs, laid as trails and as arcs over jumpable obstacles. The five power-ups are **Magnet**, **Shield**, **Score ×2**, **Coins ×2** and **Super Jump**, each with HUD timers and auras.

**Eight cities.** Each has its own sky, landmark skyline, street-wall architecture, props, vehicles, barriers, coin design, ambient weather, music and difficulty:

| City | Character | Unlock |
| --- | --- | --- |
| Tokyo | Neon gates, vending machines, maglev trains, rain | Free |
| New York | Brick canyons, fire escapes, taxis, subway entrances | Score 5,000 in one run |
| Lagos | Danfo buses, keke, BRT, lagoon bridge, palms, billboards | Player level 3 |
| London | Victorian terraces, double-deckers, phone boxes, roundels | Complete 5 missions |
| Dubai | Gold-trimmed glass towers, supercars, tram, dunes | 2,500 META Coins |
| Paris | Haussmann façades, café awnings, trams, the iron tower | Score 25,000 in one run |
| Seoul | Animated LED walls, KTX trains, delivery scooters | Player level 8 |
| Singapore | Garden towers, supertrees, MRT, ERP gantries | 6,000 META Coins |

**Platform features:**
- Dashboard, city select and player profile, with XP, levels and lifetime stats.
- Daily, weekly and seasonal missions that track real runs, with rewards you can claim once.
- 14 achievements.
- Leaderboards (daily, weekly, monthly, all-time, optionally per city) with a podium and your own rank.
- The Metawin Arena (see below).
- A cosmetic shop with 9 characters, 5 helmets, 6 trails, jump and slide effects, and intro animations.
- A 7-day login streak.
- A shareable 1200×675 score card for X.

**SKEL, the runner, is real-time 3D.** The game renders a rigged human figure with realistic proportions using Three.js:
- PBR materials, environment reflections and the current city's neon rim lights;
- real animations for sprinting, jumping, rolling (slide), stumbling and falling;
- the Metawin outfit: chrome helmet, black visor with the glowing MW symbol, violet jacket, green vest, dark pants and boots, and a glowing MW on the back.

Each frame is rendered with the game camera's exact projection and composited into the Phaser scene, so obstacles still pass in front of and behind the runner correctly. Shop and profile portraits use the same model. If WebGL or the model fails to load, the game falls back to 2D sprites. The base mesh and animations are Quaternius's *Universal Animation Library* (CC0); see `public/models/CREDITS.txt`.

**World graphics.** The cities, vehicles, props and skylines are painted procedurally from code at load time, so there are no third-party or unlicensed assets. Only the selected city's textures are generated and kept in memory. The supplied Metawin logo and character artwork (`public/brand/`) are used for branding and the dashboard hero.

## Project structure

```
src/
  app/                    Next.js app router (page + API routes)
    api/                  player, run/start, run/finish, missions/claim, daily/claim,
                          shop/purchase, shop/equip, cities/unlock, profile, leaderboard, tournaments
  components/             React UI (dashboard, screens, game screen, HUD, game over…)
  game/                   Phaser game — independent of React
    RunScene.ts           projection, rendering, player physics, collisions, effects, tutorial
    character3d.ts        SKEL: Three.js 3D runner (rig, outfit, animations, off-axis camera)
    core/generator.ts     seeded fair track generator (pure TS, unit-tested)
    art/                  procedural painters + per-city "kits"
    audio/engine.ts       procedural music & SFX
  lib/
    data/                 catalogs: cities, cosmetics, missions, achievements, rewards
    progression/          the rules engine shared by browser and server
    rules.ts              scoring + run validation limits
    tournaments.ts        Arena event definitions
    backend/              offline (local) and online (API) implementations of one interface
    server/               Supabase service client, repository, HTTP helpers
supabase/
  migrations/             0001 schema + RLS + functions, 0002 generated catalog seed
  tests/                  migration + security scenarios runnable against plain PostgreSQL
tests/                    Vitest unit tests
scripts/generate-seed.ts  regenerates 0002 from src/lib/data
```

The game is mounted via `createGame(element)` (`src/game/index.ts`) and talks to React only through callbacks (HUD updates, run end, tutorial prompts). React never touches Phaser internals.

## Online mode (Supabase)

1. **Create a Supabase project.**
2. **Apply the migrations.** Run them in order in the SQL editor:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_catalog_seed.sql`

   Or, with the Supabase CLI: `supabase link` and then `supabase db push`.
3. **Configure Auth** (Authentication → Providers / Settings):
   - Enable **Anonymous sign-ins**, which powers "Play as guest". Guests can later link an email from their profile.
   - Enable **Email** (magic link / OTP).
   - Add your site URL (for example `https://your-app.vercel.app`) to the **Redirect URLs**.
4. **Set environment variables.** Copy `.env.example` to `.env.local`, or add them in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only. Never expose it or prefix it with `NEXT_PUBLIC_`.
5. **Deploy.** Import the repository in Vercel; the default Next.js settings work.

Whenever you change a catalog in `src/lib/data`, run `npm run db:seed-sql` and apply the regenerated `0002_catalog_seed.sql`.

### Security model

- **Clients can't write.** Every table has RLS enabled. Clients can read public data (profiles, scores, tournaments, catalogs) and their own private rows (balance, transactions, missions, inventory, sessions…). There are **no** insert, update or delete policies, and write privileges are revoked from `anon` and `authenticated`. A player cannot edit their score or award themselves coins through direct database requests.
- **All writes go through validated API routes.** Each route verifies the Supabase JWT, loads the player and applies the shared rules engine (`src/lib/progression/engine.ts`). It then commits everything in one transaction through `apply_player_update()`, which only the service role can execute.
- **Optimistic locking.** A version number on `coin_balances` stops concurrent requests from double-spending coins.
- **Single-use run sessions.** Every run starts with `POST /api/run/start`, which records the server time and seed. A session can be finished exactly once.
- **Plausibility checks on every run.** `validateRun` (`src/lib/rules.ts`) checks:
  - the duration against the server-measured session time;
  - the distance against the maximum possible speed;
  - the score against the exact scoring formula for that distance and boost time;
  - coins, power-ups, actions and dodges against physical limits.

  Rejected runs are marked `rejected` with a reason.
- **Rule enforcement in the database.** Daily rewards are protected by a unique `(user_id, claimed_on)` constraint, and balances by a `>= 0` check.

`npm run test:db` runs the migrations against a plain PostgreSQL 16 database (with a small stand-in for Supabase's `auth` schema and roles). It then executes `supabase/tests/scenarios.sql`, which checks atomic updates, version conflicts, replayed sessions, double daily claims, negative balances, that clients cannot write scores or coins or call the privileged functions, and RLS isolation. Set `PGHOST`, `PGPORT` and `PGUSER` first.

**Honest limits.** Validation is plausibility-based: it blocks obviously manipulated scores, but a determined cheater could still submit a fabricated run that sits within physical limits. The next step is deterministic replay: record the input timeline, re-simulate it on the server with the session seed, and compare scores. The generator is already seeded and deterministic for this.

### Arena architecture

The Metawin Arena runs **asynchronous, score-based tournaments**, and it is labelled that way in the UI. They are not presented as live multiplayer. Events are defined in `src/lib/tournaments.ts`:

- **Daily Dash** (all cities)
- **Weekly Grand Prix** (all cities)
- **City Showdown** (a weekly featured city)
- **Special event** (a monthly season, tied to the special missions)

Rows are created on demand. Each finished run updates `tournament_entries` (best score, run count) for every event whose window and city match.

To add real-time multiplayer later, add a match service, for example Supabase Realtime channels or a WebSocket server. Players can share a session seed so they race the same track, broadcast positions, and submit results through the same `run/finish` validation path. `tournaments.kind` can gain a `live` type without changing existing events.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests: generator fairness, scoring validation, progression rules |
| `npm run test:db` | Migrations + security scenarios against PostgreSQL (`PGHOST`/`PGPORT`/`PGUSER`) |
| `npm run db:seed-sql` | Regenerate the catalog seed migration |

CI (`.github/workflows/ci.yml`) runs typecheck, unit tests, the database scenarios and a production build.

## Notes

- META Coins are an in-game currency only. There are no real-money purchases, betting or withdrawals.
- Performance: the renderer is DPR-aware (capped at 2×), objects are pooled, and only the active city's textures stay in GPU memory. Fog and draw-distance culling keep the per-frame work bounded.
- Make sure you have the rights to use the Metawin name, logo and character artwork in `public/brand/` before publishing.
