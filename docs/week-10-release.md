# Week 10: Release checklist

Before you share your game with the world, go through every section here and tick each box. Most items take a minute. Do them in order: the early ones protect your players and your leaderboard, the later ones polish.

## 1. No secret keys anywhere

Why: a secret key skips every rule you wrote, so if it's in your game or on GitHub, anyone can rewrite or wipe your leaderboard.

- [ ] Search the whole project for secret keys. In VS Code, press **Ctrl+Shift+F** (**Cmd+Shift+F** on a Mac) and search for `sb_secret`, then for `service_role`. The only results should be in `docs/`, `vite.config.js` and `.env.example`, which mention them as warnings.
- [ ] Check that `.env` was never uploaded to GitHub:

```bash
git log --all --oneline -- .env
```

You should see nothing at all. If you see one or more lines, `.env` was committed at some point: rotate your keys (below), then ask your mentor how to clean it out of the history.

- [ ] In Netlify's **Environment variables** there are exactly two: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and the key starts with `sb_publishable_` (or is the legacy anon key).
- [ ] If a secret key ever leaked, rotate it now: in Supabase, open **Project Settings → API Keys**, create a new secret key and delete the old one. A leaked key stops working the moment you delete it.

## 2. Your policies are tested

Why: what you proved in Week 5 must still be true after everything you built since.

- [ ] Run the tests:

```bash
npm test
```

You should see `0 failed` from the policy test and `Smoke test: all passed` (or `SKIPPED` if your computer doesn't have Playwright).

- [ ] Open `https://your-game.netlify.app/check.html` and click **Run the check**. All seven lines pass.
- [ ] Run the "change every score" and "delete every score" snippets from [Week 5](week-05-permissions.md#3-try-it-like-a-cheater) on your live game. Both return `[]` (or "permission denied"), and the leaderboard doesn't change.
- [ ] In Supabase, open **Advisors → Security Advisor**. There are no errors about tables without Row Level Security.
- [ ] Every table you added since Week 4 has Row Level Security turned on and a one-line comment above each policy saying who can do what.

## 3. Your leaderboard is ready for strangers

Why: as soon as the link is public, someone will try a fake score or a rude name.

- [ ] You know how to remove a score: **Table Editor → scores**, tick the row, delete. Practise once.
- [ ] You've thought about the score cap. If nobody could really score more than a few hundred, lower `100000` as [Week 5](week-05-permissions.md#what-you-can-do-now) shows, and change `MAX_SCORE` in `src/names.js` to match.
- [ ] You've decided how often you'll check the leaderboard for fake scores and rude names, for example every evening during launch week. Put it in your calendar.
- [ ] The name field still says names are public and suggests a nickname (the hint in `index.html`).

## 4. The privacy page is filled in

Why: players deserve to know what happens to the name they type, and Canadian law expects it.

- [ ] Every highlighted part of `privacy.html` (each `<mark>…</mark>`) is replaced with your own words, and the yellow "Template" note is deleted. Search the file for `<mark>`: there should be none left.
- [ ] "What we collect" lists exactly what your game saves. If you added anything (a level, a difficulty, a country), add it here.
- [ ] The Supabase region you chose in Week 4 is named (you can see it in **Project Settings → General**).
- [ ] "How long we keep it" gives a real time, and you've put a reminder in your calendar to clear old scores (the SQL is in section 7).
- [ ] The contact email works and someone reads it.
- [ ] The start screen still links to the privacy page.

## 5. PIPEDA, in plain words

PIPEDA is Canada's privacy law for businesses. A small game like yours doesn't need a lawyer, but it should follow the same common-sense rules. This is a plain-words summary, not legal advice.

1. **Ask only for what you need.** A nickname and a score. No email, age, school or location.
2. **Say why, when you ask.** The hint under the name field says names are public.
3. **Use it only for that.** Names are for the leaderboard, nothing else.
4. **Keep it safe.** Row Level Security on, no secret keys in the game, two-factor authentication on your GitHub, Supabase and Netlify accounts.
5. **Keep it only as long as you need it**, then delete it, as your privacy page promises.
6. **Let people remove their information** when they ask. Reply within 30 days, the time PIPEDA allows. Faster is better.
7. **Someone is responsible.** That's you. Your name or role and contact email are on the privacy page.
8. **If data leaks** or something goes wrong, tell your mentor and a parent or guardian right away. Businesses must report serious privacy breaches to the Office of the Privacy Commissioner of Canada and tell the people affected.

Many of your players may be under 18, like you. That's one more reason to collect nothing but a nickname and to remove anything that looks like a real full name. Involve a parent or guardian before you add anything that collects more, or takes payments.

## 6. A 404 page

Why: people mistype addresses and follow old links, and a friendly page sends them back to the game.

- [ ] Open `https://your-game.netlify.app/this-page-does-not-exist`. You see your own "This star fell off the map" page (or your version of it), not Netlify's plain one.
- [ ] Its button takes you back to the game.

## 7. Remove test scores

Why: launch with a clean leaderboard, so the top 10 shows real players, not "Test Pilot".

- [ ] In Supabase, open the **SQL Editor** and delete your test scores by name:

```sql
delete from public.scores where name in ('Test Pilot', 'Not Real', 'Check');
```

You should see `Success. No rows returned`. Add any other test names you used inside the brackets.

- [ ] Or start completely fresh, with an empty leaderboard. This deletes **every** score, so only do it before launch:

```sql
truncate table public.scores restart identity;
```

You should see `Success. No rows returned`, and the game says "No scores yet. Be the first!"

- [ ] Later, to delete scores older than your privacy page promises (here, one year):

```sql
delete from public.scores where created_at < now() - interval '1 year';
```

## 8. Your own domain on Netlify

Why: `starcatcher.ca` is easier to remember and share than `lucky-comet-123abc.netlify.app`.

1. Buy a domain with a parent's or guardian's help. A `.ca` or `.com` costs about $15 to $25 a year. The GitHub Student Developer Pack includes a free first-year domain from some registrars.
2. In Netlify, open your project's **Domain management** and click **Add a domain**. Type the domain you bought.
3. Netlify shows you exactly what to change at the company you bought the domain from: either switch to Netlify's name servers, or add the records it lists. Follow its steps word for word.
4. Wait. The change can take from a few minutes to a day to reach the whole internet.
5. Netlify sets up HTTPS (the padlock) for free by itself. Wait until the domain settings say HTTPS is active, then open `https://your-domain` and check the padlock.
6. Update the link everywhere you've shared it: social media, posters, your Campus hand-in.

## 9. Last checks

- [ ] There's no yellow local-mode banner on the live game. If there is, Netlify is missing an environment variable.
- [ ] `index.html` has your game's `<title>`, `<meta name="description">` and `og:` lines (they're what a shared link shows), not Star Catcher's.
- [ ] `favicon.svg` in `public/` is your icon, not the yellow star.
- [ ] On a phone, on mobile data (Wi-Fi off), you can play a full round with touch, pause, and save a score.
- [ ] Sound starts off, and the sound button turns it on and off.
- [ ] The game runs smoothly on the oldest phone you can borrow. If it stutters, try fewer background dots in `makeSky()` or a smaller `shadowBlur` in `src/draw.js`.
- [ ] Someone outside your class played a round and saved a score while you watched, without your help.
- [ ] Optional: delete `check.html` and remove `"check"` from the `pages` list in `vite.config.js`. It's harmless to keep (it can only do what any player can do), but players don't need it. Keep `window.__game` in `src/main.js` if you still run the smoke test: it gives cheaters nothing they don't already have.

One more thing: free Supabase projects pause after about a week with no activity. If your game will be quiet for a while, open the Supabase dashboard now and then, and if a project is paused, click **Restore**.

## You're ready when

Every box above is ticked. Then share the link and watch the leaderboard fill up.
