# Star Catcher: the game starter

A small, real browser game with a public leaderboard. Stars fall from the top, you move the basket, each catch is a point, and three misses end the round. In YStar Founders you copy this starter in Week 3 and turn it into your own game: new art, new rules, a new theme.

- Arrow keys or A and D on a keyboard; drag or tap on a phone.
- Gets faster every 10 points. Pause any time. Sound is off until you turn it on.
- Sharp on every screen, including high-DPI phones.
- Runs with no setup on day one: your best score and a top 10 are saved in your browser (local mode). In Week 4 you connect Supabase and the top 10 becomes one leaderboard for everyone.

## Quick start (5 minutes)

You need [Node.js](https://nodejs.org) 22 or newer. Open a terminal in this folder and install the packages:

```bash
npm install
```

You should see `added 27 packages` (the number can differ) and no red `ERR!` lines.

Start the game on your computer:

```bash
npm run dev
```

You should see `Local: http://localhost:5173/`. Open that address in your browser and click **Play**. A yellow banner says "Local mode: data is saved in this browser only. Connect Supabase in Week 4." That's expected.

New to all of this? Follow [Week 3: run it, change it, deploy it](docs/week-03-start.md) step by step.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the game on your computer and refreshes the browser each time you save a file |
| `npm run build` | Builds the finished game into `dist/`. Netlify runs this too |
| `npm run preview` | Shows the built game from `dist/`, exactly as Netlify will serve it |
| `npm test` | Builds the game, checks the database rules, then plays a round in a browser |

## Docs, week by week

| Week | Guide |
| --- | --- |
| 3 | [Run it, change it, deploy it](docs/week-03-start.md) |
| 4 | [Connect Supabase](docs/week-04-data.md) |
| 5 | [Prove players can't edit scores, and the honest truth about cheating](docs/week-05-permissions.md) |
| 7 | [Feature recipes: levels and a power-up, a daily challenge, saved settings](docs/week-07-features.md) |
| 10 | [Release checklist](docs/week-10-release.md) |
| Any | [Troubleshooting: error message → what it means → how to fix it](docs/troubleshooting.md) |

## What's where

| To change | Edit |
| --- | --- |
| The rules: lives, speed, how often stars fall | `RULES` at the top of `src/game.js` |
| How the game plays: catching, missing, speeding up | the rest of `src/game.js` (short, with comments) |
| Colours and shapes: sky, stars, basket, sparkles | `THEME` and the draw functions in `src/draw.js` |
| The controls | `src/input.js` |
| The sounds | `src/sound.js` |
| The score bar and the start, pause and round-over screens | `index.html` and `src/style.css` |
| How the screens, buttons and leaderboard work together | `src/main.js` |
| Which names are allowed | `src/names.js` and `supabase/setup.sql` |
| Where scores are saved | `src/store.js` |
| The database table and its rules | `supabase/setup.sql` |

## How the game works

```
src/main.js ─► src/game.js   rules, state and the game loop (update, then draw, about 60 times a second)
            │     ├─► src/input.js   keys, mouse and touch
            │     ├─► src/draw.js    the art
            │     └─► src/sound.js   beeps, off until you turn them on
            └─► src/store.js ─► local mode: localStorage in this browser
                              └─► Supabase:   the scores table (read and insert only)
```

`src/config.js` decides the mode: if `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing, the game runs in local mode. The rest of the code never needs to know which mode it's in.

In Supabase, Row Level Security is on. One policy lets anyone **read** scores and one lets anyone **insert** a score within the limits (name of 1 to 12 letters, numbers and spaces; score from 0 to 100000; no backdating). There's no policy to change or delete scores, so nobody can do that through the game or its API. You moderate in Supabase's Table Editor.

`window.__game` (in `src/main.js`) lets the automated test start a round, add points and force misses. It can't do anything a player couldn't already do with the browser's developer tools.

## Tests

`npm test` runs three things, in this order:

1. `vite build` makes sure the game builds, the same way Netlify builds it.
2. `tests/policies.mjs` loads `supabase/setup.sql` into an in-memory Postgres database ([PGlite](https://pglite.dev)) and checks every rule both ways: valid scores are saved, a 13-character name and a negative score are refused, and nobody can change or delete scores.
3. `tests/smoke.cjs` builds a local-mode copy, opens it in a real browser at phone size, presses keys, taps, pauses, forces three misses, saves a name to the leaderboard, and fails on any Console error. It needs [Playwright](https://playwright.dev); if your computer doesn't have it, the test says SKIPPED and explains how to add it.

## Stack

Vite 8.3.5, plain JavaScript and the HTML canvas (no game engine), `@supabase/supabase-js` 2.118.0, hosted on Netlify. The system font stack and sounds made by the browser, so there are no files to download. The only outside service the game talks to is Supabase.
