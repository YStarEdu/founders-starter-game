# Week 7: Feature recipes

Three features players love, each one tested with this starter. Pick one, or do all three in this order. Do one at a time, and play the game after each step.

| Recipe | You'll learn | Time |
| --- | --- | --- |
| [1. Levels and a power-up](#recipe-1-levels-and-a-power-up) | Changing game state over time, special cases in the game loop | 45 min |
| [2. A daily challenge](#recipe-2-a-daily-challenge) | Seeded random numbers, dates and time zones, an optional second leaderboard | 45 to 75 min |
| [3. Settings saved in the browser](#recipe-3-settings-saved-in-the-browser) | `localStorage`, forms, changing the rules from the outside | 30 min |

Each step says which file to open, what to find and what to put instead. To find a line quickly in VS Code, press **Ctrl+F** (**Cmd+F** on a Mac) and type part of it.

Before you start, commit your work, so you can always go back:

```bash
git add .
```

```bash
git commit -m "Before the Week 7 recipe"
```

You should see `[main …] Before the Week 7 recipe`, or `nothing to commit` if you'd already saved everything.

---

## Recipe 1: Levels and a power-up

Every 10 points you reach a new level, with a new sky colour and a "Level 2!" message. Now and then a blue power-up star falls: catch it and your basket grows 60% wider for 8 seconds. Missing a power-up star doesn't cost a life.

### 1. Add the power-up rules

Why: putting the numbers in `RULES` means you can tune the power-up later without touching the logic.

In `src/game.js`, find the last line of `RULES`:

```js
  basketSpeed: 1.3, // how fast the arrow keys move the basket, in screen widths per second
```

and add three lines after it:

```js
  powerUpChance: 0.08, // the chance that a new star is a power-up star (8 in 100)
  powerUpSeconds: 8, // how long the wide basket lasts
  wideBasketBy: 1.6, // the power-up makes the basket 60% wider
```

### 2. Remember the power-up in the state

Why: the game needs to know, on every frame, how much power-up time is left.

In `state`, find:

```js
  nextStarIn: 0, // seconds until the next star appears
```

and add a line after it:

```js
  powerUpTimeLeft: 0, // seconds left of the wide-basket power-up
```

In `startRound()`, find the end of the `Object.assign` line:

```js
message: null, nextStarIn: 0.6 });
```

and replace it with this, so every round starts without a power-up:

```js
message: null, nextStarIn: 0.6, powerUpTimeLeft: 0 });
```

### 3. Show the level

Why: "Faster!" tells players the speed changed; "Level 2!" also tells them how far they've come.

In `addPoints()`, find:

```js
    state.message = { text: "Faster!", timeLeft: 1.2 };
```

and replace it with:

```js
    state.message = { text: `Level ${state.speedUps + 1}!`, timeLeft: 1.2 };
```

### 4. Make some stars power-ups

Why: the power-up is just a star with `power: true`, so the rest of the game treats it like any other star.

In `addStar()`, find:

```js
function addStar() {
  const radius = starRadius();
  state.stars.push({
```

and replace it with:

```js
function addStar() {
  const radius = starRadius();
  const roll = random(); // always roll, so the daily challenge (recipe 2) stays the same for everyone
  state.stars.push({
    power: roll < RULES.powerUpChance && state.powerUpTimeLeft === 0,
```

### 5. Catch it, count it down, forgive misses

Why: these three small changes are the whole power-up.

At the start of `update()`, find:

```js
function update(seconds) {
  moveBasket(seconds);
```

and replace it with:

```js
function update(seconds) {
  // The power-up counts down, and the basket stays wide while it lasts.
  state.powerUpTimeLeft = Math.max(state.powerUpTimeLeft - seconds, 0);
  state.basket.width = state.basket.normalWidth * (state.powerUpTimeLeft > 0 ? RULES.wideBasketBy : 1);
  moveBasket(seconds);
```

A little lower, find:

```js
        star.caught = true;
        burst(star.x, state.basket.y);
```

and replace it with:

```js
        star.caught = true;
        if (star.power) {
          state.powerUpTimeLeft = RULES.powerUpSeconds;
          state.message = { text: "Wide basket!", timeLeft: 1.2 };
        }
        burst(star.x, state.basket.y);
```

Then find:

```js
      star.gone = true;
      missStar();
```

and replace it with:

```js
      star.gone = true;
      if (!star.power) missStar(); // missing a power-up star doesn't cost a life
```

Finally, in `resizeGame()` near the end of the file, find:

```js
  state.basket.width = clamp(width * 0.22, 72, 130);
  state.basket.height = state.basket.width * 0.45;
```

and replace it with this, so the game remembers the basket's normal width:

```js
  state.basket.normalWidth = clamp(width * 0.22, 72, 130);
  state.basket.width = state.basket.normalWidth;
  state.basket.height = state.basket.normalWidth * 0.45;
```

### 6. Draw it

Why: players need to see which star is special, which level they're on and when the power-up is working.

In `src/draw.js`, find the first two colours in `THEME`:

```js
  skyTop: "#081633",
  skyBottom: "#1c3d7a",
```

and replace them with a sky for each level, plus the power-up colours:

```js
  // One sky per level: [top colour, bottom colour]. After the last one, they start again.
  skies: [
    ["#081633", "#1c3d7a"],
    ["#1d0f45", "#4b2c8a"],
    ["#062b33", "#13727a"],
    ["#3a0d2a", "#8a2f5a"],
  ],
  powerStar: "#7fe3ff",
  powerGlow: "rgba(127, 227, 255, 0.9)",
```

In `drawScene()`, find:

```js
  drawSky(ctx, state.width, state.height, time);
  for (const star of state.stars) drawStar(ctx, star.x, star.y, star.radius, star.spin);
  drawSparkles(ctx, state.sparkles);
  drawBasket(ctx, state.basket);
```

and replace it with:

```js
  drawSky(ctx, state.width, state.height, time, state.speedUps);
  for (const star of state.stars) drawStar(ctx, star.x, star.y, star.radius, star.spin, star.power);
  drawSparkles(ctx, state.sparkles);
  drawBasket(ctx, state.basket, state.powerUpTimeLeft > 0);
```

Find the start of `drawSky()`:

```js
function drawSky(ctx, width, height, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, THEME.skyTop);
  gradient.addColorStop(1, THEME.skyBottom);
```

and replace it with:

```js
function drawSky(ctx, width, height, time, level) {
  const [top, bottom] = THEME.skies[level % THEME.skies.length];
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
```

In `drawStar()`, change the first line to:

```js
function drawStar(ctx, x, y, radius, rotation, power = false) {
```

and, in the same function, replace:

```js
  ctx.shadowColor = THEME.starGlow;
  ctx.shadowBlur = radius;
  ctx.fillStyle = THEME.star;
```

with:

```js
  ctx.shadowColor = power ? THEME.powerGlow : THEME.starGlow;
  ctx.shadowBlur = power ? radius * 2 : radius;
  ctx.fillStyle = power ? THEME.powerStar : THEME.star;
```

Last, the basket glows while the power-up lasts. At the start of `drawBasket()`, replace:

```js
function drawBasket(ctx, basket) {
  const { x, y, width, height } = basket;
  const left = x - width / 2;
```

with:

```js
function drawBasket(ctx, basket, glowing = false) {
  const { x, y, width, height } = basket;
  const left = x - width / 2;
  ctx.save();
  if (glowing) {
    ctx.shadowColor = THEME.powerGlow; // a blue glow while the power-up lasts
    ctx.shadowBlur = 20;
  }
```

and at the end of `drawBasket()`, replace:

```js
  ctx.fillRect(left - 4, y - 5, width + 8, 8);
}
```

with:

```js
  ctx.fillRect(left - 4, y - 5, width + 8, 8);
  ctx.restore();
}
```

(`save()` and `restore()` make sure the glow doesn't spill onto everything drawn after the basket.)

### 7. Test it

1. To see a power-up right away, set `powerUpChance: 1` in `RULES` for a moment. Every new star is blue until you catch one. Catch it: "Wide basket!" appears and the basket grows and glows for 8 seconds.
2. Let a blue star fall past you: the lives in the score bar stay the same.
3. Set `powerUpChance` back to `0.08`.
4. Play to 10 points: "Level 2!" appears and the sky turns purple.
5. Run `npm test`. Everything should still pass.

---

## Recipe 2: A daily challenge

A **Daily challenge** button where everyone gets the same stars, in the same order, all day. Tomorrow there's a new pattern. Optionally, the daily challenge gets its own leaderboard.

How does everyone get the same "random" stars? `Math.random()` gives different numbers every time. A **seeded** random generator gives the same numbers every time you start it with the same seed. Use today's date as the seed, and every player gets the same stars today.

### 1. Add a seeded random generator

Why: this small, well-known function is all that makes the daily pattern repeatable.

Create `src/random.js`:

```js
// Week 7: random numbers you can repeat. The same seed always gives the same numbers in the same order,
// which Math.random() can't do. (This is "mulberry32", a tiny, well-known generator: fine for games,
// never for passwords or anything secret.)
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // a number from 0 up to (not including) 1
  };
}

// Today's date in one time zone for everyone, like "2026-11-03", so players across Canada share the same day.
export const CHALLENGE_TIME_ZONE = "America/Toronto";

export function challengeDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CHALLENGE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// The seed for a day: "2026-11-03" becomes the number 20261103.
export function seedFor(day) {
  return Number(day.replaceAll("-", ""));
}
```

Check it in a terminal in your project folder. This starts the generator twice with the same seed:

```bash
node --input-type=module -e "import { seededRandom } from './src/random.js'; const a = seededRandom(20261103), b = seededRandom(20261103); console.log(a(), a()); console.log(b(), b());"
```

You should see two lines with the same two numbers, starting with `0.2427`.

### 2. Use it in the game

Why: the game already gets star positions from `random` instead of `Math.random`, so this is the only place that needs to change.

In `src/game.js`, find:

```js
import { sounds } from "./sound.js";
```

and add a line after it:

```js
import { challengeDay, seedFor, seededRandom } from "./random.js";
```

In `state`, add this line after `mode: "ready", …`:

```js
  daily: false, // true while you're playing the daily challenge
```

Find the start of `startRound()`:

```js
export function startRound() {
  Object.assign(state, { mode: "playing", score: 0,
```

and replace those two lines with:

```js
export function startRound({ daily = false } = {}) {
  // The daily challenge uses today's seed, so everyone gets the same stars in the same order today.
  random = daily ? seededRandom(seedFor(challengeDay())) : Math.random;
  Object.assign(state, { mode: "playing", daily, score: 0,
```

(The rest of that `Object.assign` line stays as it is.)

### 3. Add the button

Why: players need a way to choose the daily challenge.

In `index.html`, on the start screen, find:

```html
          <button class="button" id="play-button" type="button">Play</button>
```

and replace it with:

```html
          <div class="start-buttons">
            <button class="button" id="play-button" type="button">Play</button>
            <button class="button button-secondary" id="daily-button" type="button">Daily challenge</button>
          </div>
          <p class="hint">The daily challenge has the same stars for everyone today, and new ones tomorrow.</p>
```

In `src/main.js`, find:

```js
$("#again-button").addEventListener("click", startRound);
```

and replace it with these two lines, so **Play again** replays the same kind of round:

```js
$("#again-button").addEventListener("click", () => startRound({ daily: state.daily }));
$("#daily-button").addEventListener("click", () => startRound({ daily: true }));
```

At the end of `src/style.css`, add:

```css
/* Week 7: the Play and Daily challenge buttons */
.start-buttons {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
}
```

### 4. Test it

1. Click **Daily challenge** and watch where the first three stars fall. Press **P**, reload the page and start the daily challenge again: the same three stars fall in the same places, at the same speeds.
2. Click **Play** instead: the stars are different every time.
3. Ask a friend to open your live game on their phone and start the daily challenge: they get your stars too. (On a narrower screen, the stars land in the same places relative to the width.)

The pattern is the order the stars come in. Speed-ups still depend on your score, so a player who's further ahead sees the same stars arrive sooner.

### 5. Optional: a daily leaderboard

Why: a daily challenge is more fun when the scores start fresh every day.

Run this in Supabase's SQL Editor, then add it to the end of `supabase/setup.sql`. It adds a `day` column and replaces the insert policy, so a daily score can only be for today's challenge:

```sql
-- Week 7 recipe: the daily challenge gets its own leaderboard.
alter table public.scores add column if not exists day date; -- the challenge's date, or empty for a normal round

-- Who can do what: anyone can add a score, stamped with the time it really arrived (no backdating),
-- and a daily score only for today's challenge (give or take a day, because of time zones).
drop policy if exists "Anyone can add a score" on public.scores;
create policy "Anyone can add a score"
  on public.scores for insert
  to anon, authenticated
  with check (
    created_at > now() - interval '1 minute' and created_at <= now()
    and (day is null or day between current_date - 1 and current_date + 1)
  );
```

You should see `Success. No rows returned`. Old scores get an empty `day`, so they stay on the normal leaderboard.

In `src/store.js`, find the start of `topScores()`:

```js
export async function topScores() {
  if (LOCAL_MODE) return readJSON(LOCAL_SCORES_KEY, []);
  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .order("score", { ascending: false })
```

and replace it with:

```js
export async function topScores(day = null) {
  if (LOCAL_MODE) return readJSON(localKey(day), []);
  const query = supabase.from("scores").select("name, score, created_at");
  const { data, error } = await (day ? query.eq("day", day) : query.is("day", null))
    .order("score", { ascending: false })
```

In `saveScore()`, make four small changes:

1. `export async function saveScore(name, score) {` becomes `export async function saveScore(name, score, day = null) {`
2. `const scores = readJSON(LOCAL_SCORES_KEY, []);` becomes `const scores = readJSON(localKey(day), []);`
3. `if (!writeJSON(LOCAL_SCORES_KEY, scores.slice(0, 10))) {` becomes `if (!writeJSON(localKey(day), scores.slice(0, 10))) {`
4. `const { error } = await supabase.from("scores").insert({ name, score });` becomes:

```js
  const { error } = await supabase.from("scores").insert(day ? { name, score, day } : { name, score });
```

At the end of `src/store.js`, add:

```js
// In local mode, each daily challenge gets its own list, like "star-catcher-scores-2026-11-03".
function localKey(day) {
  return day ? `${LOCAL_SCORES_KEY}-${day}` : LOCAL_SCORES_KEY;
}
```

In `src/leaderboard.js`, change `export async function showLeaderboard(you = null) {` to:

```js
export async function showLeaderboard(you = null, day = null) {
```

and, a few lines lower, `scores = await topScores();` to:

```js
    scores = await topScores(day);
```

In `index.html`, on the round-over screen, give the leaderboard heading an id. Find:

```html
          <button class="button button-secondary" id="again-button" type="button">Play again</button>
          <h2>Top 10</h2>
```

and replace it with:

```html
          <button class="button button-secondary" id="again-button" type="button">Play again</button>
          <h2 id="over-board-title">Top 10</h2>
```

In `src/main.js`, add this line under the other `import` lines at the top:

```js
import { challengeDay } from "./random.js";
```

In `finishRound()`, find:

```js
  showNameError("");
  showLeaderboard();
```

and replace it with:

```js
  showNameError("");
  $("#over-board-title").textContent = state.daily ? "Today's challenge: top 10" : "Top 10";
  showLeaderboard(null, boardDay());
```

In the score form's submit code, change `await saveScore(name, state.score);` to `await saveScore(name, state.score, boardDay());`, and `const onTopTen = await showLeaderboard({ name, score: state.score });` to:

```js
    const onTopTen = await showLeaderboard({ name, score: state.score }, boardDay());
```

Finally, add this function just above `function showNameError(text) {`:

```js
// The day of the daily challenge being played, or null for a normal round.
function boardDay() {
  return state.daily ? challengeDay() : null;
}
```

Test it: play the daily challenge and save a score. The round-over screen says "Today's challenge: top 10" and shows only today's daily scores. In the Table Editor, your new score has today's date in `day`. Play a normal round: the normal top 10 doesn't include daily scores.

Add these checks to `tests/policies.mjs`, just above the line `await db.close();`:

```js
  // Week 7 recipe: the daily challenge leaderboard.
  await allowed("a player can save a score for today's challenge", () =>
    as("anon", "insert into public.scores (name, score, day) values ('Dee', 7, current_date)"));
  await refused("a daily score for next week", () =>
    as("anon", "insert into public.scores (name, score, day) values ('Dee', 7, current_date + 7)"));
```

Run `npm test`. You should see both new checks marked `ok` in each round, and `60 passed, 0 failed`.

---

## Recipe 3: Settings saved in the browser

A **Difficulty** choice (Easy, Normal, Hard) on the start screen, and the sound setting, both remembered the next time the player opens the game.

### 1. Store the settings

Why: one small file knows how settings are saved, so the rest of the game just asks it.

Create `src/settings.js`:

```js
// Week 7: the player's settings, saved in this browser (localStorage) so they're still there next time.
import { readJSON, writeJSON } from "./storage.js";

const SETTINGS_KEY = "star-catcher-settings";

// What each difficulty changes in RULES (src/game.js). "normal" matches the starter's own RULES.
export const DIFFICULTIES = {
  easy: { fallTime: 4.2, spawnEvery: 1.4, lives: 5 },
  normal: { fallTime: 3.2, spawnEvery: 1.1, lives: 3 },
  hard: { fallTime: 2.5, spawnEvery: 0.85, lives: 3 },
};

// The saved settings, or the defaults (sound off, normal) if nothing was saved or it was damaged.
export function loadSettings() {
  const saved = readJSON(SETTINGS_KEY, {});
  return {
    sound: saved.sound === true,
    difficulty: Object.hasOwn(DIFFICULTIES, saved.difficulty) ? saved.difficulty : "normal",
  };
}

export function saveSettings(settings) {
  writeJSON(SETTINGS_KEY, settings);
}
```

If you changed `RULES` in Week 3, copy your numbers into `normal` here, so Normal still plays the way you designed it.

### 2. Add the choices to the start screen

Why: a `fieldset` with radio buttons is the accessible way to offer one choice out of three.

In `index.html`, on the start screen, add this just below the **Play** button (below the daily challenge hint, if you did recipe 2):

```html
          <fieldset class="settings">
            <legend>Difficulty</legend>
            <label><input type="radio" name="difficulty" value="easy" /> Easy</label>
            <label><input type="radio" name="difficulty" value="normal" /> Normal</label>
            <label><input type="radio" name="difficulty" value="hard" /> Hard</label>
          </fieldset>
```

### 3. Load, save and apply them

Why: the settings change `RULES` before the next round, so the game itself needs no changes at all.

In `src/main.js`, add this line under the other `import` lines at the top:

```js
import { DIFFICULTIES, loadSettings, saveSettings } from "./settings.js";
```

Then find the sound button's code:

```js
$("#sound-button").addEventListener("click", () => {
  setSoundOn(!isSoundOn());
  $("#sound-button").setAttribute("aria-pressed", String(isSoundOn()));
});
```

and replace it with:

```js
// ---------- Settings, saved in this browser (Week 7 recipe) ----------
const settings = loadSettings();
applySettings();

$("#sound-button").addEventListener("click", () => {
  settings.sound = !settings.sound;
  saveSettings(settings);
  applySettings();
});

for (const choice of document.querySelectorAll('input[name="difficulty"]')) {
  choice.addEventListener("change", () => {
    settings.difficulty = choice.value;
    saveSettings(settings);
    applySettings();
  });
}

function applySettings() {
  setSoundOn(settings.sound);
  $("#sound-button").setAttribute("aria-pressed", String(settings.sound));
  Object.assign(RULES, DIFFICULTIES[settings.difficulty]); // changes the rules for the next round
  document.querySelector(`input[name="difficulty"][value="${settings.difficulty}"]`).checked = true;
  render(state); // shows the right number of lives
}
```

At the end of `src/style.css`, add:

```css
/* Week 7: the difficulty setting on the start screen */
.settings {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem 1rem;
  margin: 1rem 0 0;
  padding: 0.5rem 0.75rem 0.75rem;
  border: 1px solid var(--color-panel-border);
  border-radius: 12px;
}

.settings legend {
  padding: 0 0.5rem;
  font-weight: 700;
}

.settings label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  cursor: pointer;
}

.settings input {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-accent);
}
```

### 4. Test it

1. Choose **Easy**: the score bar shows five lives. Play a round: stars fall more slowly.
2. Choose **Hard** and turn the sound on. Reload the page: Hard is still chosen and the sound button still shows sound on.
3. To start over, clear the saved settings in the Console:

```js
localStorage.removeItem("star-catcher-settings");
```

Reload: you're back to Normal with sound off.

Be fair to your players: Easy scores and Hard scores share one leaderboard. If that matters for your game, put the difficulty in the leaderboard the same way recipe 2 adds the `day` column, or only allow saving scores on Normal.

## You're done when

- [ ] Your recipe works on your computer and on the live game after `git push`.
- [ ] You played it on a phone too.
- [ ] `npm test` passes, with any new checks included.
