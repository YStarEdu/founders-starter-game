# Week 5: Prove players can't edit scores, and the honest truth about cheating

Your leaderboard is public: anyone can read it and anyone can add to it. This week you prove that nobody can change or delete anyone's score, you see for yourself how a cheater would send a fake score, and you learn what the database rules can and can't do about it.

You need Supabase connected (Week 4), at least one saved score on the leaderboard, and about 45 minutes.

## Why this matters

Your publishable key is inside your game's JavaScript. Anyone can find it in a minute with the browser's developer tools. That's how Supabase is designed, and it's fine, as long as the database's rules only allow what you mean to allow.

So the real question isn't "can someone get my key?" (yes, they can). It's "what can someone do with it?" Today you find out, the way a cheater would.

## 1. Read your rules

Why: you can't check rules you haven't read.

Open `supabase/setup.sql`. In plain words, it says:

| Line | Means |
| --- | --- |
| `alter table public.scores enable row level security` | The table is locked. Through the API, nobody can do anything unless a policy allows it. |
| `create policy "Anyone can read scores" … for select` | Anyone may **read** every score. The leaderboard needs that. |
| `create policy "Anyone can add a score" … for insert` | Anyone may **add** a score, stamped with the time it really arrives (no backdating). |
| (no update or delete policy) | Nobody can **change** or **delete** a score through the API, not even their own. |
| `constraint name_is_1_to_12_characters` and the other constraints | Every new score must follow these limits, even one that doesn't come from your game. |

`anon` is the role for every player who isn't signed in, which here is everyone. Your game and a cheater's script look exactly the same to Supabase: both are `anon`, with the same publishable key.

## 2. Run the permission check page

Why: this page uses your game's real key, so it can only do what any player could do.

1. Start the game with `npm run dev` and open `http://localhost:5173/check.html`. The game doesn't link to it on purpose: it's a tool for you, not for players.
2. Click **Run the check**. It reads the leaderboard, tries to save scores that break the rules, and tries to change and delete scores. It never saves a valid score, so your leaderboard stays clean.

You should see seven lines, all marked **Pass**:

- A player can read the leaderboard.
- A player can't save a 13-character name (refused by `name_is_1_to_12_characters`).
- A player can't save a negative score (refused by `score_is_0_to_100000`).
- A player can't save a score over 100000.
- A player can't backdate a score (refused by the row-level security policy).
- A player can't change scores: 0 scores were changed.
- A player can't delete scores: 0 scores were deleted.

If the last two say "Can't tell yet", the leaderboard is empty: play a round, save a score and run the check again.

If the browser Console is open, it shows a few red `Failed to load resource` lines (status 400 or 401) while the check runs. Those are the bad scores being refused, which is exactly what you want, so here red lines are good news.

3. Open **Table Editor → scores** in Supabase. Every score is still there, unchanged.
4. Do the same on your live site: `https://your-game.netlify.app/check.html`.

If a line says **Fail**, it tells you which policy or constraint to look at. Compare yours with the original `supabase/setup.sql`, fix them in the SQL Editor, and run the check again.

## 3. Try it like a cheater

Why: a cheater doesn't play your game at all, they just send requests with your URL and key, so this is the test that counts.

1. Open your live game and the browser Console: press **F12** (on a Mac, **Cmd+Option+J**), or right-click the page, choose **Inspect**, then the **Console** tab.
2. Chrome may ask you to type `allow pasting` before it lets you paste. That's a good warning: never paste code you don't understand. You'll understand these: each one asks your own database to do something.
3. Paste this, with your own Project URL and publishable key in the first two lines, and press Enter. It tries to set every score to 99999:

```js
const url = "https://abcdefghijklmnopqrst.supabase.co";
const key = "sb_publishable_AbC123...";
const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=representation" };
const change = await fetch(`${url}/rest/v1/scores?score=gte.0`, { method: "PATCH", headers, body: JSON.stringify({ score: 99999 }) });
console.log(change.status, await change.json());
```

You should see `200 []`: the database answered, and the list of changed scores is empty. Some projects answer `401` with `permission denied for table scores` instead. Both are a pass.

4. Now try to delete every score:

```js
const remove = await fetch(`${url}/rest/v1/scores?score=gte.0`, { method: "DELETE", headers });
console.log(remove.status, await remove.json());
```

You should see `200 []` (or `401`) again. Reload the game: the top 10 hasn't changed.

## 4. The honest truth about cheating

Now try the one thing the rules allow: adding a score. Paste this:

```js
const fake = await fetch(`${url}/rest/v1/scores`, { method: "POST", headers, body: JSON.stringify({ name: "Not Real", score: 99999 }) });
console.log(fake.status);
```

You should see `201`, which means "created". Reload the game: **Not Real, 99999** is at the top of your leaderboard, and nobody played a single round.

That's not a bug in your game. It's true of every browser game: the game runs on the player's computer, so anything the game can send, a player can send too, with any score they like. Hiding the key doesn't help (the game needs it), and scrambling your code only slows people down.

Now delete that fake score: in **Table Editor → scores**, tick its row and delete it. You can always do that, because the dashboard isn't limited by the policies.

### What your rules do: they cap the damage

Try sending a score over the limit:

```js
const tooBig = await fetch(`${url}/rest/v1/scores`, { method: "POST", headers, body: JSON.stringify({ name: "Not Real", score: 100001 }) });
console.log(tooBig.status, await tooBig.json());
```

You should see `400` and a message that mentions `score_is_0_to_100000`. Nothing was saved.

So even a cheater:

- can't post a score above 100000, or below 0;
- can't post a name longer than 12 characters, or with links, HTML or symbols;
- can't change or delete anyone else's score, or fix their own;
- can't backdate a score, which matters if you add daily leaderboards (Week 7).

### What you can do now

- **Moderate.** Check the leaderboard now and then, and delete fake scores and rude names in the Table Editor.
- **Lower the cap to something real.** What's the best score anyone could reach in, say, 15 minutes? If it's around 500, change `100000` to `1000` in `setup.sql` and the game's `MAX_SCORE` in `src/names.js`. Then a fake score can't be much better than a great real one. You'd run this in the SQL Editor (and update `setup.sql` to match):

```sql
alter table public.scores drop constraint if exists score_is_0_to_100000;
alter table public.scores add constraint score_is_0_to_1000 check (score between 0 and 1000);
```

### Ideas for later

Each of these is a bigger project. Talk to your mentor before you start one.

- **Check scores on a server.** A Supabase Edge Function (code that runs on Supabase, not in the browser) gives each round a start time, and refuses scores that are impossible for how long the round lasted, such as more than 2 stars a second. The insert policy is closed to the public, and only the function, which keeps its secret key on the server, can save scores.
- **Replay checking.** The game records every key press and the star pattern's seed (see the daily challenge in Week 7), and the server replays the round to see whether the score is real. Serious games do this.
- **Rate limits.** At most one score a minute from the same player, enforced by a server function.
- **Sign-in.** Tie scores to accounts (the web app track shows how), so you can ban a cheater instead of deleting their scores one by one.
- **Approve names first.** Add an `approved` column and change the read policy to `using (approved)`, so a new name only appears after you tick it in the Table Editor.

## 5. Run the policy test

Why: this test checks the same rules on your computer, in a pretend database, every time you run `npm test`.

```bash
npm test
```

You should see the build, then two rounds of checks ending with:

```
56 passed, 0 failed
```

and then the browser smoke test (or `SKIPPED the browser smoke test` if your computer doesn't have Playwright, which is fine). The policy test runs twice on purpose: once like a Supabase project that gives players broad access by default, and once like one that doesn't. Your rules must hold in both.

If you change `setup.sql`, run `npm test` again. A new policy that lets players change or delete scores makes it fail.

## You're done when

- [ ] All seven lines on the check page pass, locally and on the live site.
- [ ] The Console snippets couldn't change or delete any score.
- [ ] You posted a fake score, saw it on the leaderboard, and deleted it in the Table Editor.
- [ ] You can explain to a friend why a browser game can't fully stop cheating, and what your rules do instead.
- [ ] `npm test` says `56 passed, 0 failed`.

Next: in Week 6 you build your main features with GitHub Copilot, in small tested steps. Week 7's [feature recipes](week-07-features.md) are ready when you are.
